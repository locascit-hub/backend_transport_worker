const { MongoClient } = require("mongodb");
const fs = require("fs");
const path= require("path");
const { Upload_CacheIAlertAuthTokens, readIAlertTokensCache ,runMultipleFetches} = require("./ServerCacheMakers/CacheGet");
const {UpdateLocationByOBUId} = require("./DB/LocationCollection");
//generic MongoDB connection URI and DB info
const uri = "mongodb+srv://pandimuthaiah2006:muthu2006@cluster0.wnkamf8.mongodb.net/college_transport?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "college_transport";

const outputPath = path.join(__dirname.split("/").slice(0, -1).join("/"), "servercaches");




const CacheShareLink = async () => {
    //read a mongo db doc
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const collection = client.db(dbName).collection("incharges");
        const doc = await collection.findOne({_id:"share_link"}); // Modify the query as needed
        console.log("Document found:", doc);
        fs.writeFileSync(path.join(outputPath, "share_link.txt"), doc.url, 'utf8');
        return doc.url;
    } catch (error) {
        console.error("Error reading document:", error);
    } finally {
        await client.close();
    }

}

const GetShareLinkCache=async () => {
    try {
        const data = fs.readFileSync(path.join(outputPath, "share_link.txt"), 'utf8');
        return data;
    }
    catch (error) {
        console.error("Error reading cache file:", error);
        return null;
    }
}
    

const fetchBusData = async (authToken,share_link,obuIds) => {
const test= await fetch('https://ialert2.ashokleyland.com/ialertelite/apiv1/map/track-vehicle', {
  method: 'POST',
  headers: {
    'Authorizationl': authToken, // use Authorizationl if that's what server expects
    'Origin': 'https://ialert2.ashokleyland.com',
    'Referer': share_link,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  },
  body: JSON.stringify({"obuIds":obuIds})
});

const data=await test.json();
console.log(data);
return data.data.vehicleDetails;
}

let timer;

async function main(){

let share_link=null;
if (fs.existsSync(path.join(outputPath, "share_link.txt"))) {
    share_link = await GetShareLinkCache();
    console.log("Share link loaded from cache:", share_link);
}
else {
    share_link = await CacheShareLink();
}

let ialert_tokens=null;
if (fs.existsSync(path.join(outputPath, "ialerttokens.txt"))) {
    ialert_tokens = readIAlertTokensCache();
    console.log("IAlert tokens loaded from cache:", ialert_tokens);
}
else {
    ialert_tokens=await runMultipleFetches(1, share_link);
    await Upload_CacheIAlertAuthTokens(ialert_tokens);
}

console.log("IAlert tokens Ready:", ialert_tokens);

const obuIds=["2304178142","2403208052","2503178183","2304178210","2402286096","2304087116","2403206022","2402246156","2505098072","2304088151","2304188028","2403077102","2304088159","2403027022","2304178136","2304188123","2402267028","2402287141","2403208010","2304187040","2403026010","2402288141","2304177193","2403168028","2403198097","2403078079","2403206056","2402247143","2304088137","2402268058","2304188042","2502257252","2304087132","2403208002","2403196081","2503258036","2403207014","2505098025","2402287143","2403206018","2504247063","2504246078","2503257123","2304088144","2504258003","2304087130","2304088128","2504248085","2503258027","2505086150","2402276132","2304177200","2504297104","2503186171","2505138012","2502156019","2503186162","2503258144","2504246055","2504258002","2505086160","2505087135","2504298094","2503116045","2503186109"];

let i=0;
//fetch only for 2 hrs
timer=setInterval(async () => {
try{
    if (i >= 5) { // 2 hours = 120 minutes, fetch every 3 minutes
        console.log("Stopping fetching after 2 hours.");
        await stopFetching();
        return;
    }
    console.log("Fetching data for obuIds:", obuIds);
    const responses= await fetchBusData(ialert_tokens["0"].Auth_Token, share_link, obuIds);
    //it should loop in a sync way
    for (let i = 0; i < obuIds.length; i++) {
        const vehicleData = responses[i]
        if (vehicleData) {
            const obuId = vehicleData.obuId;
            const latitude = vehicleData.currentInfo.latitude;
            const longitude = vehicleData.currentInfo.longitude;
            const speed = vehicleData.currentInfo.gpsSpeed;
            console.log(`Updating location for OBU ID ${obuId}:`, { latitude, longitude, speed });
            await UpdateLocationByOBUId(obuId, latitude, longitude, speed);
            console.log(`✅ Location updated for OBU ID ${responses[i].currentInfo}`);
        }
    }
    console.log(`Cycle ${i + 1} completed.`);
    // Increment the counter
    i++;
} catch (error) {
    console.error("Error during fetch:", error);
    await stopFetching();
    return;
}

}, 180000);// Fetch every 3 minutes

}

async function stopFetching() {
    if (timer) {
        clearInterval(timer);
        console.log("Fetching stopped.");
    }
}

main();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path= require("path");


//generic MongoDB connection URI and DB info
const uri = "mongodb+srv://pandimuthaiah2006:muthu2006@cluster0.wnkamf8.mongodb.net/college_transport?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "college_transport";

//output path
const outputPath = path.join(__dirname.split(path.sep).slice(0, -1).join(path.sep), "servercaches");
console.log("Output Path:", outputPath);

//obuId
async function CacheObuIds(fieldName= "obu_id") {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection("buses_frontend");

    // Project only one field
    const documents = await collection.find({}, { projection: { [fieldName]: 1, _id: 0 } }).toArray();

    // Extract the field into an array
    const fieldArray = documents.map(doc => doc[fieldName]).filter(id=>id.length>0);

    // Store as JSON array in txt file
    fs.writeFileSync(path.join(outputPath, "obuIds.txt"), JSON.stringify(fieldArray), "utf-8");
    console.log(`✅ Extracted and saved [${fieldName}] field to ${path.join(outputPath, "obuIds.txt")}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

function readObuIdsCache() {
  try {
    if (!fs.existsSync(path.join(outputPath, "obuIds.txt"))) {
      fs.writeFileSync(path.join(outputPath, "obuIds.txt"), "[]", "utf-8");
      console.log("✅ Created empty obuIds.txt file.");
      return [];
    }

    const content = fs.readFileSync(path.join(outputPath, "obuIds.txt"), "utf-8");
    const fieldArray = JSON.parse(content);
    console.log("✅ Field array loaded:", fieldArray);
    return fieldArray;
  } catch (error) {
    console.error("❌ Error reading file:", error);
    return [];
  }
}

//StoreObuIds();
//readObuIds();


//iAlert Auth Tokens
//write the responses as documents in a MongoDB collection
async function Upload_CacheIAlertAuthTokens(responses,keyField= "Cycle_time"){
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db(dbName).collection("I_Alert");
    const bulkOps = Object.entries(responses).map(([key, value]) => ({
      updateOne: {
        filter: { [keyField]: key },
        update: { $set: value },
        upsert: true // Insert if not exists
      }
    }));

    const result = await collection.bulkWrite(bulkOps);
    console.log("Bulk write result:", result);
    fs.writeFileSync(path.join(outputPath, "ialerttokens.txt"), JSON.stringify(responses), "utf-8");
    console.log(`✅ Auth tokens uploaded and saved to ${path.join(outputPath, "ialerttokens.txt")}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

function readIAlertTokensCache() {
 try {
    const raw = fs.readFileSync(path.join(outputPath, "ialerttokens.txt"), "utf-8");
    const obj = JSON.parse(raw);

    console.log("✅ Parsed object:", obj);
    return obj;
  } catch (error) {
    console.error("❌ Failed to read object:", error);
    return {};
  }
}

//CacheIAlertAuthTokens();
//readIAlertTokensCache();


function getRandomDelay(min = 15000, max = 120000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generate13DigitId() {
  return Date.now().toString(); // Returns current timestamp in ms (13 digits)
}

async function fetchWithDelay(authId, referer, browserTabId) {

  const response = await fetch('https://ialert2.ashokleyland.com/ialertelite/apiv1/map/get-share-link-token', {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9,ta;q=0.8',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Origin': 'https://ialert2.ashokleyland.com',
      'Referer': referer,
      'bandwidth': '10',
      'browserDetails': JSON.stringify({
        name: 'Chrome',
        fullVersion: '138.0.0.0',
        majorVersion: 138,
        screenResolution: '487 x 577',
        osName: 'Windows',
        browserName: 'Chrome',
        isMobileBrowser: false
      }),
      'osName': 'Windows',
      'userDomain': 'ialert2.ashokleyland.com',
      'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({
      auth: authId,
      browserTabId: browserTabId
    })
  });

  const data = await response.json();
  console.log("Response:", data);
  return data;
}

async function runMultipleFetches(times,share_link) {
  const authId = share_link.split('/').pop(); // Extract authId from share_link
  console.log("Auth ID:", authId);
  const referer =share_link; // Use share_link as referer
  const responses = {};

  for (let i = 0; i < times; i++) {
    const delay = getRandomDelay();
    await new Promise(res => setTimeout(res, delay));
    const browserTabId = generate13DigitId();
    const result = await fetchWithDelay(authId, referer,browserTabId);
    responses[i+'']={Browser_id:browserTabId,Auth_Token:result.data.result[0].auth_token,Cycle_time:i+''};
  }

  console.log("All responses:", responses);
  return responses;
}



module.exports = {
  CacheObuIds,
  readObuIdsCache,
  Upload_CacheIAlertAuthTokens,
  readIAlertTokensCache,
  runMultipleFetches,
};
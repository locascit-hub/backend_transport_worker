import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {buses_obu_ids} from "./buses.js";

dotenv.config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // use service_role key only on backend

// Create client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generate13DigitId() {
  return Date.now().toString(); // Returns current timestamp in ms (13 digits)
}

async function fetchAuthTokens(authId, referer, browserTabId) {

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

async function generateAuthTokens(share_link) {
  const authId = share_link.split('/').pop(); // Extract authId from share_link
  console.log("Auth ID:", authId);
  const referer =share_link; // Use share_link as referer
  const browserTabId = generate13DigitId();
  const result = await fetchAuthTokens(authId, referer, browserTabId);
  const response={Browser_id:browserTabId,Auth_Token:result.data.result[0].auth_token};
//   const response={
//   Browser_id: '1755666603463',
//   Auth_Token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIxIjpbeyJmaXJzdG5hbWUiOiJDSVQgVFJBTlNQT1JUIiwiZnVsbG5hbWUiOiIiLCJsb2dpbmlkIjoiODc3ODUyMDMzMiIsInBob25ldXBkYXRlIjowLCJ0ZW1wcGFzcyI6ZmFsc2UsInVzZXJpZCI6MTY1MTg3LCJ1c2Vycm9sZSI6Ik9XTkVSIEFETUlOIiwidXNlcnJvbGVpZCI6NiwiZmlyc3R0aW1lbG9naW4iOjEsImxhc3Rsb2dpbiI6MTc1NTY3NTQ1OS4wLCJsZHBhdGgiOiJob21lIiwibG9naW5zdGF0dXMiOiJ2YWxpZCIsInBsYXRmb3JtIjoidyIsInVuaXBhc3MiOmZhbHNlLCJ0b2tlbnZhbCI6IjE3NTU2NjY0NjAxNjUxODcifV0sInN1YiI6Ijg3Nzg1MjAzMzIiLCJleHAiOjE3NTU2ODk5MjB9.HEkgEkCxPFtRUeKxYt7oBvZrvtJBWiLe0kd7jwEABIk'
// }

  console.log("response:", response);
  return response;
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

async function UpdateLocationsBatch(vehicles) {
  const updates = vehicles.map(v => ({
    _id: v.obuId,                     // primary key
    lat: v.currentInfo.latitude,
    long: v.currentInfo.longitude,
    last: new Date(),
  }));

  const { data, error } = await supabase
    .from("Location")
    .upsert(updates, { onConflict: "_id" });

  if (error) {
    console.error("❌ Error batch updating:", error);
  } else {
    console.log(`✅ Batch updated ${updates.length} locations`);
  }
}

async function location_job(auth_token, share_link) {
  let i = 0;
  timer = setInterval(async () => {
    try {
      if (i >= 2) {
        console.log("Stopping fetching after 2 hours.");
        await stopFetching();
        return;
      }

      console.log("Fetching data for obuIds:", buses_obu_ids);
      const responses = await fetchBusData(auth_token, share_link, buses_obu_ids);

      // Batch update instead of per-row update
      await UpdateLocationsBatch(responses);

      console.log(`✅ Cycle ${i + 1} completed.`);
      i++;
    } catch (error) {
      console.error("Error during fetch:", error);
      await stopFetching();
      return;
    }
  }, 180000); // 3 minutes
}



async function stopFetching() {
    if (timer) {
        clearInterval(timer);
        console.log("Fetching stopped.");
    }
}




async function main() {
  // Example: Insert data into "incharges" table
  const { data: urlDoc, error: insertError } = await supabase
    .from("incharges").select('url').eq("_id", "share_link").single();

  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Inserted:", urlDoc);
  }

  console.log(buses_obu_ids,'hello')
  const share_link = urlDoc.url;
  console.log(share_link);
  const authToken = await generateAuthTokens(share_link);
  console.log("Generated Auth Tokens:", authToken);

  await location_job(authToken.Auth_Token, share_link);
}

main();

//mongo db
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

//generic MongoDB connection URI and DB info
//generic MongoDB connection URI and DB info
const uri = "mongodb+srv://pandimuthaiah2006:muthu2006@cluster0.wnkamf8.mongodb.net/college_transport?retryWrites=true&w=majority&appName=Cluster0";
const dbName = "college_transport";


async function UpdateLocationByOBUId(obuId, latitude,longitude, speed) {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const collection = client.db(dbName).collection("Location");
        const result = await collection.updateOne(
            { _id: obuId+'' },
            { $set: { "latitude": latitude, "longitude": longitude, "speed": speed ,"timestamp": new Date()} }
        );
        if (result.modifiedCount > 0) {
            console.log(`✅ Updated location for OBU ID ${obuId}`);
        } else {
            console.log(`❌ No document found with OBU ID ${obuId}`);
        }
    } catch (error) {
        console.error("❌ Error updating document:", error);
    }
    finally {
        await client.close();
    }
}


module.exports = { UpdateLocationByOBUId };
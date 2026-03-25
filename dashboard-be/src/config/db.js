// dashboard-be/src/config/db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);
let db;

const connectDB = async () => {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    await db.collection("rooms").createIndex({ room_id: 1 }, { unique: true });
    console.log("INFO: MongoDB Connected");
  } catch (error) {
    console.error("ERROR: DB Connection Failed:", error);
    process.exit(1);
  }
};

const getDB = () => db;
module.exports = { connectDB, getDB };

// dashboard-be/src/config/database.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);
let db;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
      throw new Error(
        "Missing MONGODB_URI or DB_NAME in environment variables",
      );
    }
    await client.connect();
    db = client.db(process.env.DB_NAME);

    await db.collection("rooms").createIndex({ room_id: 1 }, { unique: true });

    console.log("INFO: MongoDB Connected & Indexed");
    return db;
  } catch (error) {
    console.error("ERROR: MongoDB Connection Error:", error);
    process.exit(1);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB };

// dashboard-be/src/services/roomService.js
const { getDB } = require("../config/database");

const updateRoomStatus = async (room_id, payload) => {
  const db = getDB();
  const result = await db.collection("rooms").findOneAndUpdate(
    { room_id },
    {
      $set: {
        "last_reading.temp": payload.temp,
        "last_reading.humidity": payload.hum,
        "last_reading.timestamp": new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result.value || result;
};

const getAllRooms = async () => {
  const db = getDB();
  return await db.collection("rooms").find({}).toArray();
};

module.exports = { updateRoomStatus, getAllRooms };

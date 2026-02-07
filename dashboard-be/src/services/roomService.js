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

const getRoomTrend = async (room_id) => {
  const db = getDB();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await db
    .collection("sensor_logs")
    .find({
      room_id,
      timestamp: { $gte: oneDayAgo },
    })
    .sort({ timestamp: 1 })
    .toArray();
};

module.exports = { updateRoomStatus, getAllRooms, getRoomTrend };

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

  const results = await db
    .collection("sensor_logs")
    .aggregate([
      {
        $match: {
          room_id: room_id,
          "measurements.ts": { $gte: oneDayAgo },
        },
      },
      { $unwind: "$measurements" },
      {
        $match: {
          "measurements.ts": { $gte: oneDayAgo },
        },
      },
      {
        $project: {
          _id: 0,
          temp: "$measurements.t",
          hum: "$measurements.h",
          timestamp: "$measurements.ts",
        },
      },
      { $sort: { timestamp: 1 } },
    ])
    .toArray();

  return results;
};

const logSensorData = async (room_id, payload) => {
  const db = getDB();
  const now = new Date();

  // Format tanggal YYYY-MM-DD
  const dateStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();

  return await db.collection("sensor_logs").updateOne(
    {
      room_id,
      date: dateStr,
      hour: currentHour,
    },
    {
      $push: {
        measurements: {
          t: payload.temp,
          h: payload.hum,
          ts: now,
        },
      },
      $inc: { count: 1 }, // Menambah jumlah count secara otomatis
    },
    { upsert: true },
  );
};

const logAlarm = async (room_id, status, value) => {
  const db = getDB();
  const alarmEntry = {
    room_id,
    status,
    value, // menyimpan nilai temperatur saat alarm terjadi
    timestamp: new Date(),
  };

  try {
    await db.collection("alarm_logs").insertOne(alarmEntry);
    return alarmEntry;
  } catch (err) {
    console.error("ERROR: Failed to log alarm:", err);
  }
};

module.exports = {
  updateRoomStatus,
  getAllRooms,
  getRoomTrend,
  logSensorData,
  logAlarm,
};

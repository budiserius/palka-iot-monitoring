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

  // Menggunakan Aggregation agar data 'measurements' keluar dari array-nya
  const results = await db
    .collection("sensor_logs")
    .aggregate([
      {
        $match: {
          room_id: room_id,
          // Cari dokumen yang memiliki setidaknya satu data dalam 24 jam terakhir
          "measurements.ts": { $gte: oneDayAgo },
        },
      },
      { $unwind: "$measurements" }, // Memecah array menjadi dokumen terpisah
      {
        $match: {
          "measurements.ts": { $gte: oneDayAgo }, // Filter ulang setelah dipecah
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
      { $sort: { timestamp: 1 } }, // Urutkan dari yang paling lama
    ])
    .toArray();

  return results; // Akan mengembalikan array: [{temp, hum, timestamp}, ...]
};

module.exports = { updateRoomStatus, getAllRooms, getRoomTrend };

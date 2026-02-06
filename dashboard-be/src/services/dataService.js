const { getDB } = require("../config/database");

const processSensorData = async (roomId, payload) => {
  const db = getDB();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const hour = now.getHours();

  // 1. Update Dokumen Real-time (Untuk Gauge Dashboard)
  await db.collection("rooms").updateOne(
    { room_id: roomId },
    {
      $set: {
        last_reading: {
          temp: payload.temp,
          humidity: payload.hum,
          timestamp: now,
        },
      },
    },
    { upsert: true },
  );

  // 2. Update Dokumen Bucket (Untuk Line Chart Trend)
  await db.collection("sensor_logs").updateOne(
    { room_id: roomId, date: dateStr, hour: hour },
    {
      $push: { measurements: { t: payload.temp, h: payload.hum, ts: now } },
      $inc: { count: 1 },
    },
    { upsert: true },
  );
};

module.exports = { processSensorData };

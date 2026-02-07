const { getDB } = require("../config/database");

const processSensorData = async (roomId, payload) => {
  const db = getDB();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const hour = now.getHours();

  // 1. Update Dokumen Real-time
  const result = await db.collection("rooms").findOneAndUpdate(
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
    {
      upsert: false,
      returnDocument: "after",
    },
  );

  // MongoDB Driver terbaru mengembalikan dokumen langsung di objek 'result'
  // Namun beberapa versi lama menaruhnya di 'result.value'
  const updatedDoc = result.value ? result.value : result;

  // 2. Update Dokumen Bucket
  await db.collection("sensor_logs").updateOne(
    { room_id: roomId, date: dateStr, hour: hour },
    {
      $push: { measurements: { t: payload.temp, h: payload.hum, ts: now } },
      $inc: { count: 1 },
    },
    { upsert: true },
  );

  return updatedDoc;
};

module.exports = { processSensorData };

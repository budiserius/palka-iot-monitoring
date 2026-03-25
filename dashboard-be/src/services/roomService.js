// dashboard-be/src/services/roomService.js
const repo = require("../repositories/roomRepository");

const getAlarmStatus = (temp) => {
  if (temp === 0) return "Disconnected";
  if (temp >= 65) return "Emergency";
  if (temp >= 60) return "Warning Level 2";
  if (temp >= 55) return "Warning Level 1";
  return "Connected";
};

const processSensorData = async (room_id, payload) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  // Log Sensor History
  await repo.pushSensorLog(room_id, dateStr, now.getHours(), {
    t: payload.temp,
    h: payload.hum,
    ts: now,
  });

  // Update Last Reading
  return await repo.updateRoomData(room_id, {
    "last_reading.temp": payload.temp,
    "last_reading.humidity": payload.hum,
  });
};

module.exports = { getAlarmStatus, processSensorData };

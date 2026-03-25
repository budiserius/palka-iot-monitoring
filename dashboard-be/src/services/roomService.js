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

// Logic Risk Score
const LIMITS = {
  HUMIDITY_OPTIMAL_MIN: 10.0,
  HUMIDITY_OPTIMAL_MAX: 20.0,
  HUMIDITY_WARNING_LOW: 8.0,
  HUMIDITY_WARNING_HIGH: 25.0,
  HUMIDITY_CRITICAL_LOW: 5.0,
  HUMIDITY_CRITICAL_HIGH: 30.0,
  TEMP_CRITICAL: 55.0,
  TEMP_WARNING_HIGH: 40.0,
  TEMP_WARNING_MEDIUM: 35.0,
  TEMP_NORMAL_MAX: 30.0,
};

const calculateRiskStatus = (temperature, humidity) => {
  let riskScore = 0;

  if (temperature >= LIMITS.TEMP_CRITICAL) riskScore += 4;
  else if (temperature >= LIMITS.TEMP_WARNING_HIGH) riskScore += 3;
  else if (temperature >= LIMITS.TEMP_WARNING_MEDIUM) riskScore += 2;
  else if (temperature >= LIMITS.TEMP_NORMAL_MAX) riskScore += 1;

  if (humidity < LIMITS.HUMIDITY_CRITICAL_LOW) riskScore += 4;
  else if (humidity < LIMITS.HUMIDITY_WARNING_LOW) riskScore += 3;
  else if (humidity > LIMITS.HUMIDITY_CRITICAL_HIGH) riskScore += 4;
  else if (humidity > LIMITS.HUMIDITY_WARNING_HIGH) riskScore += 2;
  else if (
    humidity >= LIMITS.HUMIDITY_OPTIMAL_MIN &&
    humidity <= LIMITS.HUMIDITY_OPTIMAL_MAX
  )
    riskScore += 0;
  else riskScore += 1;

  if (
    temperature > LIMITS.TEMP_WARNING_MEDIUM &&
    humidity > LIMITS.HUMIDITY_WARNING_HIGH
  )
    riskScore += 2;
  if (
    temperature > LIMITS.TEMP_WARNING_MEDIUM &&
    humidity < LIMITS.HUMIDITY_WARNING_LOW
  )
    riskScore += 2;
  if (riskScore >= 8) return "Critical";
  if (riskScore >= 5) return "High Risk";
  if (riskScore >= 3) return "Moderate Risk";
  if (riskScore >= 1) return "Low Risk";
  return "Safe";
};

module.exports = { getAlarmStatus, processSensorData, calculateRiskStatus };

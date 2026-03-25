// dashboard-be/src/repositories/roomRepositories.js
const { getDB } = require("../config/db");

const findRooms = () => getDB().collection("rooms").find({}).toArray();

const updateRoomData = (room_id, data) =>
  getDB()
    .collection("rooms")
    .findOneAndUpdate(
      { room_id },
      { $set: { ...data, "last_reading.timestamp": new Date() } },
      { upsert: true, returnDocument: "after" },
    );

const insertAlarmLog = (log) => getDB().collection("alarm_logs").insertOne(log);

const getAlarmLogs = (query, limit = 50) =>
  getDB()
    .collection("alarm_logs")
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

const pushSensorLog = (room_id, dateStr, hour, measurement) =>
  getDB()
    .collection("sensor_logs")
    .updateOne(
      { room_id, date: dateStr, hour },
      { $push: { measurements: measurement }, $inc: { count: 1 } },
      { upsert: true },
    );

const getSensorLogsByRoom = (room_id, sinceDate) =>
  getDB()
    .collection("sensor_logs")
    .aggregate([
      { $match: { room_id, "measurements.ts": { $gte: sinceDate } } },
      { $unwind: "$measurements" },
      { $match: { "measurements.ts": { $gte: sinceDate } } },
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

const deleteAlarmLogById = (id) =>
  getDB()
    .collection("alarm_logs")
    .deleteOne({ _id: new (require("mongodb").ObjectId)(id) });

const clearAllAlarmLogs = () => getDB().collection("alarm_logs").deleteMany({});

module.exports = {
  findRooms,
  updateRoomData,
  insertAlarmLog,
  getAlarmLogs,
  pushSensorLog,
  getSensorLogsByRoom,
  deleteAlarmLogById,
  clearAllAlarmLogs,
};

const { getDB } = require("../config/database");

const updateRoomStatus = async (room_id, timestamp) => {
  const db = getDB();
  const result = await db
    .collection("rooms")
    .findOneAndUpdate(
      { room_id },
      { $set: { "last_reading.timestamp": timestamp } },
      { upsert: true, returnDocument: "after" },
    );
  return result.value || result;
};

const getAllRooms = async () => {
  const db = getDB();
  return await db.collection("rooms").find({}).toArray();
};

module.exports = { updateRoomStatus, getAllRooms };

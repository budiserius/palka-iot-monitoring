const repo = require("../repositories/roomRepository");
const { getDB } = require("../config/db"); // Import langsung getDB

exports.getRooms = async (req, res) => {
  try {
    const data = await repo.findRooms();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAlarms = async (req, res) => {
  try {
    const { room_id } = req.params;
    const query = room_id ? { room_id } : {};
    const data = await repo.getAlarmLogs(query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoomTrend = async (req, res) => {
  try {
    const { room_id } = req.params;
    // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const data = await repo.getSensorLogsByRoom(room_id, oneDayAgo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAlarm = async (req, res) => {
  try {
    await repo.deleteAlarmLogById(req.params.id);
    res.json({ message: "Alarm deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadAllLogs = async (req, res) => {
  try {
    const db = getDB();

    // DEBUG 1: Cek apakah DB terhubung
    if (!db) {
      console.error("DEBUG: Database object is UNDEFINED");
      return res.status(500).json({ error: "Database not connected yet" });
    }

    // DEBUG 2: Cek jumlah dokumen di collection
    const count = await db.collection("alarm_logs").countDocuments();
    console.log("DEBUG: Total documents in alarm_logs:", count);

    // DEBUG 3: Ambil 1 data contoh
    const sample = await db.collection("alarm_logs").findOne();
    console.log("DEBUG: Sample document:", sample);

    const logs = await db.collection("alarm_logs").find({}).toArray();
    res.json(logs);
  } catch (err) {
    console.error("DEBUG: Error in downloadAllLogs:", err);
    res.status(500).json({ error: err.message });
  }
};

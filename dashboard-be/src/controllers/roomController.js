const repo = require("../repositories/roomRepository");

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
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
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

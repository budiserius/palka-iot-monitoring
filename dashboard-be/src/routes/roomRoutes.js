// dashboard-be/src/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const { getAllRooms, getRoomTrend } = require("../services/roomService");

router.get("/", async (req, res) => {
  try {
    const rooms = await getAllRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/all/alarms", async (req, res) => {
  try {
    const db = require("../config/database").getDB();
    const logs = await db
      .collection("alarm_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    res.json(logs); // Pastikan ini mengirim JSON
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:room_id/trend", async (req, res) => {
  try {
    const { room_id } = req.params;
    const data = await getRoomTrend(room_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:room_id/alarms", async (req, res) => {
  try {
    const { room_id } = req.params;
    const db = require("../config/database").getDB();
    const logs = await db
      .collection("alarm_logs")
      .find({ room_id })
      .sort({ timestamp: -1 })
      .limit(50) // Ambil 50 kejadian terakhir
      .toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

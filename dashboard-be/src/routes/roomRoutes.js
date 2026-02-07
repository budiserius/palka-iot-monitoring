// dashboard-be/src/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const { getAllRooms } = require("../services/roomService");

router.get("/", async (req, res) => {
  try {
    const rooms = await getAllRooms();
    res.json(rooms);
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

module.exports = router;

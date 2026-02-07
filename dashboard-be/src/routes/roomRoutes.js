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

module.exports = router;

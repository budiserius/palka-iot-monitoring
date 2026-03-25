// src/routes/roomRoutes.js
const express = require("express");
const router = express.Router();
const roomCtrl = require("../controllers/roomController");

router.get("/", roomCtrl.getRooms);
router.get("/alarms", roomCtrl.getAlarms); // All alarms
router.get("/:room_id/alarms", roomCtrl.getAlarms); // Specific room
router.get("/:room_id/trend", roomCtrl.getRoomTrend);
router.delete("/alarms/:id", roomCtrl.deleteAlarm);

module.exports = router;

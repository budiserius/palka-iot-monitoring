const mqtt = require("mqtt");
const repo = require("../repositories/roomRepository");
const {
  getAlarmStatus,
  processSensorData,
} = require("../services/roomService");

let lastKnownStatus = {};

module.exports = (io) => {
  const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

  mqttClient.on("connect", () => {
    mqttClient.subscribe("palka/+/data");
    console.log("INFO: MQTT Connected");
  });

  mqttClient.on("message", async (topic, message) => {
    const room_id = topic.split("/")[1];
    const payload = JSON.parse(message.toString());
    const currentStatus = getAlarmStatus(payload.temp);

    // Cek Perubahan Status
    if (lastKnownStatus[room_id] !== currentStatus) {
      await repo.insertAlarmLog({
        room_id,
        status: currentStatus,
        value: payload.temp,
        timestamp: new Date(),
      });
      lastKnownStatus[room_id] = currentStatus;

      io.emit("room-status-update", {
        room_id,
        status: currentStatus,
        timestamp: new Date(),
      });
    }

    await processSensorData(room_id, payload);
    io.emit("sensor-update", { room_id, ...payload, timestamp: new Date() });
  });

  // Check Offline Devices (Every 10s)
  setInterval(async () => {
    const rooms = await repo.findRooms();
    const now = new Date();
    for (const room of rooms) {
      const diff = (now - new Date(room.last_reading?.timestamp)) / 1000;
      if (diff > 30 && lastKnownStatus[room.room_id] !== "Disconnected") {
        lastKnownStatus[room.room_id] = "Disconnected";
        await repo.insertAlarmLog({
          room_id: room.room_id,
          status: "Disconnected",
          value: 0,
          timestamp: now,
        });
        io.emit("room-status-update", {
          room_id: room.room_id,
          status: "Disconnected",
          timestamp: now,
        });
      }
    }
  }, 10000);
};

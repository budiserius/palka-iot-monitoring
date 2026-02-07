const mqtt = require("mqtt");
const { updateRoomStatus, getAllRooms } = require("../services/roomService");

const initIoTHandler = (io) => {
  const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

  mqttClient.on("connect", () => {
    mqttClient.subscribe("palka/+/data");
    console.log("📡 MQTT Subscribed");
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const room_id = topic.split("/")[1];
      const payload = JSON.parse(message.toString());

      const updatedRoom = await updateRoomStatus(room_id, payload);

      // Emit data sensor mentah
      io.emit("sensor-update", { room_id, ...payload, timestamp: new Date() });

      // Emit status room
      io.emit("room-status-update", {
        id: updatedRoom._id,
        room_id,
        status: "online",
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("⚠️ IoT Handler Error:", err.message);
    }
  });

  // Background task: Cek offline setiap 60 detik
  setInterval(async () => {
    const rooms = await getAllRooms();
    const now = new Date();

    rooms.forEach((room) => {
      if (room.last_reading?.timestamp) {
        const diff = (now - new Date(room.last_reading.timestamp)) / 1000 / 60;
        if (diff > 1) {
          io.emit("room-status-update", {
            id: room._id,
            room_id: room.room_id,
            status: "offline",
            timestamp: room.last_reading.timestamp,
          });
        }
      }
    });
  }, 60000);
};

module.exports = initIoTHandler;

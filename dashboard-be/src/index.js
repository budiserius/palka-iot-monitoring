const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
require("dotenv").config();

const { connectDB } = require("./config/database");
const { processSensorData } = require("./services/dataService");

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const startServer = async () => {
  try {
    // Pastikan DB terkoneksi sebelum MQTT mulai terima data
    await connectDB();

    const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

    mqttClient.on("connect", () => {
      console.log("✅ MQTT Connected & Subscribed to Palka Topics");
      mqttClient.subscribe("palka/+/data");
    });

    mqttClient.on("message", async (topic, message) => {
      try {
        const roomId = topic.split("/")[1]; // Mengambil "Room-1" dari "palka/Room-1/data"
        const payload = JSON.parse(message.toString());

        // Simpan ke MongoDB (Real-time & History)
        await processSensorData(roomId, payload);

        // Kirim ke Frontend secara instan via WebSocket
        io.emit("sensor-update", {
          room_id: roomId,
          ...payload,
          ts: new Date(),
        });
      } catch (err) {
        console.error("⚠️ Message Error:", err.message);
      }
    });

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend Sensor Service online on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Critical Server Error:", error);
  }
};

startServer();

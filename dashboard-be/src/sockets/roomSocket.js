const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/database");
const { updateRoomStatus } = require("./services/roomService");
const { initRoomStatusMonitor } = require("./sockets/roomSocket");
const roomRoutes = require("./routes/roomRoutes");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);

const startServer = async () => {
  await connectDB();

  const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

  mqttClient.on("connect", () => {
    mqttClient.subscribe("palka/+/data");
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const room_id = topic.split("/")[1];
      const now = new Date();

      const updatedRoom = await updateRoomStatus(room_id, now);

      io.emit("room-status-update", {
        id: updatedRoom._id.toString(),
        room_id,
        status: "online",
        timestamp: now,
      });
    } catch (err) {
      console.error("⚠️ MQTT Error:", err.message);
    }
  });

  initRoomStatusMonitor(io);

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

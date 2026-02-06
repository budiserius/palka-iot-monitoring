const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
const cors = require("cors");
require("dotenv").config();

const { connectDB, getDB } = require("./config/database");
const { processSensorData } = require("./services/dataService");

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// --- API ENDPOINTS ---

/**
 * 1. Endpoint untuk Gauge Chart
 * Mengambil data bacaan terakhir dari semua ruangan
 */
app.get("/api/rooms", async (req, res) => {
  try {
    const db = getDB();
    const rooms = await db.collection("rooms").find({}).toArray();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch room status" });
  }
});

/**
 * 2. Endpoint untuk Line Chart
 * Mengambil history data berdasarkan Room ID dan Tanggal tertentu
 */
app.get("/api/logs/:roomId", async (req, res) => {
  try {
    const db = getDB();
    const { roomId } = req.params;
    // Ambil tanggal hari ini jika tidak ada query date
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const logs = await db
      .collection("sensor_logs")
      .find({ room_id: roomId, date: date })
      .sort({ hour: 1 })
      .toArray();

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// --- CORE SERVICES (MQTT & SOCKET) ---

const startServer = async () => {
  try {
    await connectDB();

    const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

    mqttClient.on("connect", () => {
      console.log("✅ MQTT Connected & Subscribed to Palka Topics");
      mqttClient.subscribe("palka/+/data");
    });

    mqttClient.on("message", async (topic, message) => {
      try {
        const roomId = topic.split("/")[1];
        const payload = JSON.parse(message.toString());

        // Validasi payload sederhana
        if (payload.temp === undefined || payload.hum === undefined) return;

        // Simpan ke MongoDB (Real-time & History)
        await processSensorData(roomId, payload);

        // Broadcast data ke semua client yang terkoneksi via WebSocket
        io.emit("sensor-update", {
          room_id: roomId,
          temp: payload.temp,
          hum: payload.hum,
          ts: new Date(),
        });
      } catch (err) {
        console.error("⚠️ Message Error:", err.message);
      }
    });

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Backend Sensor Service online on port ${PORT}`);
      console.log(`📡 API Available at http://localhost:${PORT}/api/rooms`);
    });
  } catch (error) {
    console.error("❌ Critical Server Error:", error);
  }
};

startServer();

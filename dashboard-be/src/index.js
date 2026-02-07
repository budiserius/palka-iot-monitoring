const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mqtt = require("mqtt");
const cors = require("cors");
require("dotenv").config();

const { connectDB, getDB } = require("./config/database");

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Endpoint untuk mendapatkan daftar room saat aplikasi pertama kali dimuat
app.get("/api/rooms", async (req, res) => {
  try {
    const db = getDB();
    const rooms = await db.collection("rooms").find({}).toArray();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

const startServer = async () => {
  try {
    await connectDB();
    const db = getDB();

    const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

    mqttClient.on("connect", () => {
      mqttClient.subscribe("palka/+/data");
    });

    mqttClient.on("message", async (topic, message) => {
      try {
        const room_id = topic.split("/")[1];
        const now = new Date();

        const result = await db.collection("rooms").findOneAndUpdate(
          { room_id: room_id }, // Cari berdasarkan room_id
          {
            $set: {
              "last_reading.timestamp": now,
              // Anda bisa tambahkan payload temp/hum di sini jika ingin disimpan
            },
          },
          {
            upsert: true, // Jika tidak ada, buat baru
            returnDocument: "after",
          },
        );

        const updatedRoom = result.value || result;

        io.emit("room-status-update", {
          id: updatedRoom._id.toString(),
          room_id: room_id,
          status: "online",
          timestamp: now,
        });
      } catch (err) {
        console.error("⚠️ MQTT Error:", err.message);
      }
    });

    // Pengecekan Offline secara berkala (Setiap 1 menit)
    setInterval(async () => {
      try {
        const rooms = await db.collection("rooms").find({}).toArray();
        const now = new Date();

        rooms.forEach((room) => {
          if (room.last_reading?.timestamp) {
            const lastActive = new Date(room.last_reading.timestamp);
            const diff = (now - lastActive) / 1000 / 60; // Hitung selisih menit

            if (diff > 5) {
              // Jika lebih dari 5 menit tidak ada data
              io.emit("room-status-update", {
                id: room._id.toString(),
                room_id: room.room_id,
                status: "offline",
                timestamp: lastActive,
              });
            }
          }
        });
      } catch (err) {
        console.error("⚠️ Interval Error:", err.message);
      }
    }, 60000);

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 ListRoom Service online on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Critical Error:", error);
  }
};

startServer();

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

app.get("/api/rooms/status", async (req, res) => {
  try {
    const db = getDB();
    const roomsStatus = await db
      .collection("rooms")
      .find({})
      .project({
        room_id: 1,
        "last_reading.timestamp": 1,
        _id: 0,
      })
      .toArray();

    const result = roomsStatus.map((room) => ({
      room_id: room.room_id,
      last_active: room.last_reading?.timestamp || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity status" });
  }
});

app.get("/api/rooms", async (req, res) => {
  try {
    const db = getDB();
    const rooms = await db.collection("rooms").find({}).toArray();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch room status" });
  }
});

app.get("/api/logs/:roomId", async (req, res) => {
  try {
    const db = getDB();
    const { roomId } = req.params;
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

const startServer = async () => {
  try {
    await connectDB();

    const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

    mqttClient.on("connect", () => {
      mqttClient.subscribe("palka/+/data");
    });

    mqttClient.on("message", async (topic, message) => {
      try {
        const roomId = topic.split("/")[1];
        const payload = JSON.parse(message.toString());

        if (payload.temp === undefined || payload.hum === undefined) return;

        await processSensorData(roomId, payload);

        const updateData = {
          room_id: roomId,
          temp: payload.temp,
          hum: payload.hum,
          ts: new Date(),
        };

        io.emit("sensor-update", updateData);

        io.emit("room-status-update", {
          room_id: roomId,
          status: "online",
          last_active: updateData.ts,
        });
      } catch (err) {
        console.error(err.message);
      }
    });

    setInterval(async () => {
      try {
        const db = getDB();
        const rooms = await db.collection("rooms").find({}).toArray();
        const now = new Date();

        rooms.forEach((room) => {
          if (room.last_reading?.timestamp) {
            const lastActive = new Date(room.last_reading.timestamp);
            const diff = (now - lastActive) / 1000 / 60;

            if (diff > 5) {
              io.emit("room-status-update", {
                room_id: room.room_id,
                status: "offline",
                last_active: lastActive,
              });
            }
          }
        });
      } catch (err) {
        console.error(err.message);
      }
    }, 60000);

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();

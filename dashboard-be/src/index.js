// dashboard-be/src/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { connectDB } = require("./config/database");
const roomRoutes = require("./routes/roomRoutes");
const initIoTHandler = require("./sockets/iotHandler");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);

const startServer = async () => {
  await connectDB();

  // Inisialisasi logika MQTT & Socket
  initIoTHandler(io);

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();

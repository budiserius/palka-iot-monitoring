const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { connectDB } = require("./config/db");
const roomRoutes = require("./routes/roomRoutes");
const initIoT = require("./sockets/iotHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);

(async () => {
  await connectDB();
  initIoT(io);
  server.listen(4000, () => console.log("Server running on port 4000"));
})();

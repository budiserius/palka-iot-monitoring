// dashboard-be/src/sockets/iotHandler.js
const mqtt = require("mqtt");
const { updateRoomStatus, getAllRooms } = require("../services/roomService");

const initIoTHandler = (io) => {
  const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

  mqttClient.on("connect", () => {
    mqttClient.subscribe("palka/+/data");
    console.log("INFO: MQTT Subscribed");
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      const room_id = topic.split("/")[1];
      const payload = JSON.parse(message.toString());
      const temp = payload.temp;

      let alarmStatus = "Connected";
      if (temp >= 55 && temp < 60) alarmStatus = "Warning Level 1";
      else if (temp >= 60 && temp < 65) alarmStatus = "Warning Level 2";
      else if (temp >= 65) alarmStatus = "Emergency";

      const updatedRoom = await updateRoomStatus(room_id, payload);

      io.emit("sensor-update", { room_id, ...payload, timestamp: new Date() });

      io.emit("room-status-update", {
        id: updatedRoom._id || updatedRoom.value?._id,
        room_id,
        status: alarmStatus,
        timestamp: new Date(),
      });

      // // 3. Perbaiki bagian ini: Gunakan variabel alarmStatus, bukan string "online" manual
      // io.emit("room-status-update", {
      //   id: updatedRoom._id || updatedRoom.value?._id, // Penanganan jika return findOneAndUpdate berbeda
      //   room_id,
      //   status: alarmStatus,
      //   timestamp: new Date(),
      // });
    } catch (err) {
      console.error("ERROR: IoT Handler Error:", err.message);
    }
  });

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
            status: "Disconnected", // Sesuai dengan type RoomStatus di Frontend
            timestamp: room.last_reading.timestamp,
          });
        }
      }
    });
  }, 60000);
};

module.exports = initIoTHandler;

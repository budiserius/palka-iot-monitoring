// dashboard-be/src/sockets/iotHandler.js
const mqtt = require("mqtt");
const {
  updateRoomStatus,
  getAllRooms,
  logSensorData,
  logAlarm,
} = require("../services/roomService");

const lastKnownStatus = {};

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

      if (lastKnownStatus[room_id] !== alarmStatus) {
        await logAlarm(room_id, alarmStatus, temp);
        lastKnownStatus[room_id] = alarmStatus; // Update status terakhir
      }

      await logSensorData(room_id, payload);

      const updatedRoom = await updateRoomStatus(room_id, payload);

      io.emit("sensor-update", { room_id, ...payload, timestamp: new Date() });

      io.emit("room-status-update", {
        id: updatedRoom._id || updatedRoom.value?._id,
        room_id,
        status: alarmStatus,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("ERROR: IoT Handler Error:", err.message);
    }
  });

  setInterval(async () => {
    try {
      const rooms = await getAllRooms();
      const now = new Date();

      rooms.forEach(async (room) => {
        if (room.last_reading?.timestamp) {
          const lastReadingTs = new Date(room.last_reading.timestamp);
          const diffInSeconds = (now - lastReadingTs) / 1000;

          if (diffInSeconds > 30) {
            const room_id = room.room_id;
            if (lastKnownStatus[room_id] !== "Disconnected") {
              await logAlarm(room_id, "Disconnected", 0);
              lastKnownStatus[room_id] = "Disconnected";
            }
            const timestamp = new Date();

            io.emit("room-status-update", {
              id: room._id,
              room_id: room_id,
              status: "Disconnected",
              timestamp: timestamp,
            });

            // Kirim data 0 agar line plot bergerak turun ke bawah
            const offlinePayload = {
              room_id: room_id,
              temp: 0,
              hum: 0,
              timestamp: timestamp,
            };

            io.emit("sensor-update", offlinePayload);
            io.emit(`sensor-update-${room_id}`, offlinePayload);
          }
        }
      });
    } catch (err) {
      console.error("Error in Offline Interval:", err.message);
    }
  }, 10000);
};

module.exports = initIoTHandler;

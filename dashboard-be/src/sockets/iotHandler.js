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

  // Ambil status terakhir dari database saat startup
  const syncInitialStatus = async () => {
    const rooms = await getAllRooms();
    rooms.forEach((room) => {
      if (room.last_reading?.temp) {
        const temp = room.last_reading.temp;
        let status = "Connected";
        if (temp >= 55 && temp < 60) status = "Warning Level 1";
        else if (temp >= 60 && temp < 65) status = "Warning Level 2";
        else if (temp >= 65) status = "Emergency";

        // Cek jika sudah terlalu lama tidak ada data (Disconnected)
        const diff =
          (new Date() - new Date(room.last_reading.timestamp)) / 1000;
        lastKnownStatus[room.room_id] = diff > 30 ? "Disconnected" : status;
      }
    });
    console.log("INFO: lastKnownStatus synchronized with database");
  };

  syncInitialStatus();

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

      // HANYA LOG JIKA BERUBAH
      if (lastKnownStatus[room_id] !== alarmStatus) {
        await logAlarm(room_id, alarmStatus, temp);
        lastKnownStatus[room_id] = alarmStatus;

        // Emit update status hanya jika ada perubahan
        const updatedRoom = await updateRoomStatus(room_id, payload);
        io.emit("room-status-update", {
          id: updatedRoom._id || updatedRoom.value?._id,
          room_id,
          status: alarmStatus,
          timestamp: new Date(),
        });
      }

      await logSensorData(room_id, payload);
      await updateRoomStatus(room_id, payload); // Tetap update last_reading tanpa log alarm

      io.emit("sensor-update", { room_id, ...payload, timestamp: new Date() });
    } catch (err) {
      console.error("ERROR: IoT Handler Error:", err.message);
    }
  });

  setInterval(async () => {
    try {
      const rooms = await getAllRooms();
      const now = new Date();

      for (const room of rooms) {
        if (room.last_reading?.timestamp) {
          const room_id = room.room_id;
          const diffInSeconds =
            (now - new Date(room.last_reading.timestamp)) / 1000;

          if (
            diffInSeconds > 30 &&
            lastKnownStatus[room_id] !== "Disconnected"
          ) {
            await logAlarm(room_id, "Disconnected", 0);
            lastKnownStatus[room_id] = "Disconnected";

            io.emit("room-status-update", {
              id: room._id,
              room_id: room_id,
              status: "Disconnected",
              timestamp: new Date(),
            });

            const offlinePayload = {
              room_id,
              temp: 0,
              hum: 0,
              timestamp: new Date(),
            };
            io.emit("sensor-update", offlinePayload);
            io.emit(`sensor-update-${room_id}`, offlinePayload);
          }
        }
      }
    } catch (err) {
      console.error("Error in Offline Interval:", err.message);
    }
  }, 10000);
};

module.exports = initIoTHandler;

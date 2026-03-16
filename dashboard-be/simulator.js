const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://103.67.78.244:1883");
const ROOM_ID = "ROOM_001";
const TOPIC = `palka/${ROOM_ID}/data`;

console.log(`🚀 Simulator IoT Aktif untuk ${ROOM_ID}`);

let currentTemp = 25;

client.on("connect", () => {
  console.log("✅ Terhubung ke MQTT Broker");

  setInterval(() => {
    if (currentTemp < 70) {
      currentTemp += 1;
    } else {
      currentTemp = 25;
      console.log("♻️ Reset suhu ke normal...");
    }

    const payload = {
      temp: currentTemp,
      hum: Math.floor(Math.random() * (60 - 40 + 1) + 40), // Humidity acak 40-60%
      ts: new Date().toISOString(),
    };

    client.publish(TOPIC, JSON.stringify(payload));

    let status = "NORMAL";
    if (currentTemp >= 65) status = "🚨 EMERGENCY";
    else if (currentTemp >= 60) status = "⚠️ LEVEL 2";
    else if (currentTemp >= 55) status = "⚠️ LEVEL 1";

    console.log(
      `[${status}] Sent: ${currentTemp}°C | ${payload.hum}% to ${TOPIC}`,
    );
  }, 1000);
});

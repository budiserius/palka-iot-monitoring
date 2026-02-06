# Palka IoT Monitor

## Functional Requirements

- Read Temperature Sensor
- Read Humidity Sensor
- Give warning to user
- Monitoring difference room

# Non Functional Requirements

- Can update real time

# Database Scheme

1. Room Collections (Real time)

```json
{
  "room_id": "Room 1",
  "last_reading": {
    "temp": 24.5,
    "humidity": 65.2,
    "timestamp": "2026-02-06T20:55:00Z"
  },
  "thresholds": { "max_temp": 30, "min_temp": 15 }
}
```

2. Sensor Logs Collection (Trend)

```json
{
  "room_id": "Room 1",
  "date": "2026-02-06",
  "hour": 20,
  "measurements": [
    { "t": 24.5, "h": 65.2, "ts": "2026-02-06T20:00:01Z" },
    { "t": 24.6, "h": 65.1, "ts": "2026-02-06T20:01:01Z" }
    // ... data satu jam ke depan masuk ke array ini
  ],
  "avg_temp": 24.55 // Opsional: Untuk percepat rendering chart
}
```

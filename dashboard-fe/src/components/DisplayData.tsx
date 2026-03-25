"use client";
import { useState, useEffect, ReactNode, useMemo } from "react";
import { socket } from "@/lib/socket";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

import dynamic from "next/dynamic";
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

type CardProps = { children: ReactNode };

function Card({ children }: CardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border bg-white p-6 shadow-sm dark:bg-black">
      {children}
    </div>
  );
}

const LIMITS = {
  HUMIDITY_OPTIMAL_MIN: 10,
  HUMIDITY_OPTIMAL_MAX: 20,
  HUMIDITY_CRITICAL_LOW: 5,
  HUMIDITY_CRITICAL_HIGH: 30,
  TEMP_CRITICAL: 55,
  TEMP_WARNING_HIGH: 40,
  TEMP_NORMAL_MAX: 30,
};

export default function DisplayData({
  selectedRoomId,
}: {
  selectedRoomId: string;
}) {
  const [data, setData] = useState({ temp: 0, hum: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const riskInfo = useMemo(() => {
    const { temp, hum } = data;
    if (temp === 0 && hum === 0) return { label: "Offline", color: "#9ca3af" };

    if (
      temp >= LIMITS.TEMP_CRITICAL ||
      hum < LIMITS.HUMIDITY_CRITICAL_LOW ||
      hum > LIMITS.HUMIDITY_CRITICAL_HIGH
    ) {
      return { label: "CRITICAL", color: "#DC2626" };
    }
    if (temp >= LIMITS.TEMP_WARNING_HIGH) {
      return { label: "HIGH RISK", color: "#EA580C" };
    }
    if (temp >= LIMITS.TEMP_NORMAL_MAX) {
      return { label: "MODERATE", color: "#FB923C" };
    }
    return { label: "SAFE", color: "#22c55e" };
  }, [data]);

  useEffect(() => {
    if (!selectedRoomId) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        const [resRooms, resTrend] = await Promise.all([
          fetch(`${backendUrl}/api/rooms`),
          fetch(`${backendUrl}/api/rooms/${selectedRoomId}/trend`),
        ]);

        const rooms = await resRooms.json();
        const trend = await resTrend.json();

        const current = rooms.find((r: any) => r.room_id === selectedRoomId);
        if (current?.last_reading) {
          setData({
            temp: current.last_reading.temp || 0,
            hum: current.last_reading.humidity || current.last_reading.hum || 0,
          });
        }

        setHistory(trend);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoading(false);
      }
    };

    fetchData();

    const handleUpdate = (newData: any) => {
      if (newData.room_id === selectedRoomId) {
        const sensorPayload = {
          temp: newData.temp,
          hum: newData.hum,
          timestamp: newData.timestamp || new Date(),
        };

        setData({ temp: sensorPayload.temp, hum: sensorPayload.hum });

        setHistory((prev) => {
          const updated = [...prev, sensorPayload];
          // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          // return updated.filter((d) => new Date(d.timestamp) >= oneDayAgo);
          return updated.slice(-600); // tampilkan 30 data terakhir
        });
      }
    };

    const handleStatusUpdate = (statusData: any) => {
      if (
        statusData.room_id === selectedRoomId &&
        statusData.status === "Disconnected"
      ) {
        const offlinePayload = {
          temp: 0,
          hum: 0,
          timestamp: new Date(),
        };

        setData({ temp: 0, hum: 0 }); // Gauge jadi 0

        setHistory((prev) => {
          const updated = [...prev, offlinePayload]; // Grafik tambah titik 0
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return updated.filter((d) => new Date(d.timestamp) >= oneDayAgo);
        });
      }
    };

    socket.on(`sensor-update-${selectedRoomId}`, handleUpdate);
    socket.on("sensor-update", handleUpdate);
    socket.on("room-status-update", handleStatusUpdate); // DAFTARKAN LISTENER STATUS

    return () => {
      socket.off(`sensor-update-${selectedRoomId}`, handleUpdate);
      socket.off("sensor-update", handleUpdate);
      socket.off("room-status-update", handleStatusUpdate); // BERSIHKAN
    };
  }, [selectedRoomId]);

  if (!selectedRoomId) {
    return (
      <div className="flex w-full items-center justify-center text-gray-400 italic">
        Pilih ruangan di sisi kiri untuk melihat data...
      </div>
    );
  }

  // --- Logika Warna & Config (Tetap Sama) ---
  const getTempColor = (temp: any) => {
    if (temp <= 0) return "#9ca3af"; // Abu-abu jika sensor mati
    if (temp <= 55) return "#5BE12C";
    if (temp <= 60) return "#FB923C";
    if (temp <= 65) return "#EA580C";
    return "#DC2626";
  };

  const getHumColor = (hum: any) => {
    if (hum <= 0) return "#9ca3af";
    if (hum < 30) return "#93C5FD";
    if (hum <= 70) return "#3B82F6";
    return "#1E3A8A";
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { maxTicksLimit: 5, font: { size: 10 } },
        grid: { display: false },
      },
      y: { ticks: { font: { size: 10 } } },
    },
    animation: { duration: 1000, easing: "linear" as const }, // Animasi diperhalus
  };

  return (
    <div
      className={`w-full p-4 transition-opacity md:p-6 ${loading ? "opacity-50" : "opacity-100"}`}
    >
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold">Monitoring: {selectedRoomId}</h2>
          <p className="text-sm text-gray-500">
            Berdasarkan standar IMSBC Code
          </p>
        </div>
        {/* Indikator Status Risiko Baru */}
        <div
          className="flex items-center gap-2 rounded-full border px-4 py-1"
          style={{ borderColor: riskInfo.color }}
        >
          <div
            className="h-3 w-3 animate-pulse rounded-full"
            style={{ backgroundColor: riskInfo.color }}
          />
          <span className="text-sm font-bold" style={{ color: riskInfo.color }}>
            {riskInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card Temperature */}
        <Card>
          <h2 className="mb-2 text-xl font-bold">Temperature Palka</h2>
          <GaugeComponent
            value={data.temp}
            minValue={0}
            maxValue={80}
            arc={{
              width: 0.2,
              padding: 0.02,
              subArcs: [
                { limit: LIMITS.TEMP_NORMAL_MAX, color: "#22c55e" }, // Safe
                { limit: LIMITS.TEMP_WARNING_HIGH, color: "#FB923C" }, // Moderate
                { limit: LIMITS.TEMP_CRITICAL, color: "#EA580C" }, // High
                { color: "#DC2626" }, // Critical
              ],
            }}
            labels={{ valueLabel: { hide: true } }}
          />
          <div
            className="my-4 text-5xl font-black"
            style={{
              color:
                data.temp <= LIMITS.TEMP_NORMAL_MAX
                  ? "#22c55e" // Safe - hijau
                  : data.temp <= LIMITS.TEMP_WARNING_HIGH
                    ? "#FB923C" // Moderate - oranye
                    : data.temp <= LIMITS.TEMP_CRITICAL
                      ? "#EA580C" // High - oranye tua
                      : "#DC2626", // Critical - merah
            }}
          >
            {data.temp}
            <span className="text-xl">°C</span>
          </div>
          <div className="h-40 w-full">
            <Line
              data={{
                labels: history.map((h) =>
                  new Date(h.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ),
                datasets: [
                  {
                    data: history.map((h) => h.temp),
                    borderColor: "#EA4228",
                    backgroundColor: "rgba(234, 66, 40, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                  },
                ],
              }}
              options={lineChartOptions}
            />
          </div>
        </Card>

        {/* Card Humidity */}
        <Card>
          <h2 className="mb-2 text-xl font-bold">Humidity Palka</h2>
          <GaugeComponent
            value={data.hum}
            minValue={0}
            maxValue={100}
            arc={{
              width: 0.2,
              padding: 0.02,
              subArcs: [
                { limit: LIMITS.HUMIDITY_CRITICAL_LOW, color: "#0c4a6e" }, // Kering - biru gelap
                { limit: LIMITS.HUMIDITY_OPTIMAL_MIN, color: "#3b82f6" }, // Optimal low - biru cerah
                { limit: LIMITS.HUMIDITY_OPTIMAL_MAX, color: "#60a5fa" }, // Optimal high - biru muda
                { limit: LIMITS.HUMIDITY_CRITICAL_HIGH, color: "#0284c7" }, // Basah - biru medium
                { color: "#0e7490" }, // Sangat basah - biru tua
              ],
            }}
            labels={{ valueLabel: { hide: true } }}
          />
          <div
            className="my-4 text-5xl font-black"
            style={{
              color:
                data.hum <= LIMITS.HUMIDITY_CRITICAL_LOW
                  ? "#0c4a6e" // Kering - biru gelap
                  : data.hum <= LIMITS.HUMIDITY_OPTIMAL_MIN
                    ? "#3b82f6" // Optimal low - biru cerah
                    : data.hum <= LIMITS.HUMIDITY_OPTIMAL_MAX
                      ? "#60a5fa" // Optimal high - biru muda
                      : data.hum <= LIMITS.HUMIDITY_CRITICAL_HIGH
                        ? "#0284c7" // Basah - biru medium
                        : "#0e7490", // Sangat basah - biru tua
            }}
          >
            {data.hum}
            <span className="text-xl">%</span>
          </div>
          <div className="h-40 w-full">
            <Line
              data={{
                labels: history.map((h) =>
                  new Date(h.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ),
                datasets: [
                  {
                    data: history.map((h) => h.hum),
                    borderColor: "#1E88E5",
                    backgroundColor: "rgba(30, 136, 229, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                  },
                ],
              }}
              options={lineChartOptions}
            />
          </div>
        </Card>
      </div>

      {/* Legend Information */}
      <div className="mt-6 rounded-md bg-blue-50 p-4 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <strong>💡 Info IMSBC Code:</strong> Batubara paling stabil pada
        kelembapan 10-20%. Suhu di atas 55°C menandakan reaksi oksidasi kritis
        yang harus segera ditangani.
      </div>
    </div>
  );
}

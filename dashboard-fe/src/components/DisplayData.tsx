"use client";
import { useState, useEffect, ReactNode } from "react";
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
  TimeScale,
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

import dynamic from "next/dynamic";
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

type CardProps = { children: ReactNode };

function Card({ children }: CardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

export default function DisplayData({
  selectedRoomId,
}: {
  selectedRoomId: string;
}) {
  const [data, setData] = useState({ temp: 0, hum: 0 });
  const [history, setHistory] = useState<any[]>([]); // State untuk trend
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRoomId) return;

    setLoading(true);

    // 1. Ambil data trend 24 jam terakhir & Data Terakhir
    const fetchData = async () => {
      try {
        const [resRooms, resTrend] = await Promise.all([
          fetch(`http://localhost:4000/api/rooms`),
          fetch(`http://localhost:4000/api/rooms/${selectedRoomId}/trend`),
        ]);

        const rooms = await resRooms.json();
        const trend = await resTrend.json();

        // Update Gauge
        const current = rooms.find((r: any) => r.room_id === selectedRoomId);
        if (current?.last_reading) {
          setData({
            temp: current.last_reading.temp || 0,
            hum: current.last_reading.hum || 0,
          });
        }

        // Update Trend
        setHistory(trend);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoading(false);
      }
    };

    fetchData();

    // 2. Listen data real-time via Socket
    // Menggunakan event spesifik room agar lebih efisien (sesuai refactor backend sebelumnya)
    const handleUpdate = (newData: any) => {
      // Pastikan data untuk room yang dipilih
      if (newData.room_id === selectedRoomId || !newData.room_id) {
        const sensorPayload = {
          temp: newData.temp,
          hum: newData.hum,
          timestamp: newData.timestamp || new Date(),
        };

        // Update Gauge
        setData({ temp: sensorPayload.temp, hum: sensorPayload.hum });

        // Update Chart & Maintain 24h Window
        setHistory((prev) => {
          const updated = [...prev, sensorPayload];
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return updated.filter((d) => new Date(d.timestamp) >= oneDayAgo);
        });
      }
    };

    socket.on(`sensor-update-${selectedRoomId}`, handleUpdate);
    // Fallback jika backend lama masih pakai "sensor-update" umum
    socket.on("sensor-update", handleUpdate);

    return () => {
      socket.off(`sensor-update-${selectedRoomId}`, handleUpdate);
      socket.off("sensor-update", handleUpdate);
    };
  }, [selectedRoomId]);

  if (!selectedRoomId) {
    return (
      <div className="flex w-full items-center justify-center text-gray-400 italic">
        Pilih ruangan di sisi kiri untuk melihat data...
      </div>
    );
  }

  const getTempColor = (temp: any) => {
    if (temp <= 20) return "#5BE12C"; // Cold/Safe
    if (temp <= 40) return "#F5CD19"; // Warning/Warm
    return "#EA4228"; // Hot/Danger
  };

  const currentColor = getTempColor(data.temp);

  const getHumColor = (hum: any) => {
    if (hum < 30) return "#93C5FD"; // Biru muda (Kering)
    if (hum <= 70) return "#3B82F6"; // Biru standar (Ideal)
    return "#1E3A8A"; // Biru gelap (Sangat Lembap/Basah)
  };

  const currentHumColor = getHumColor(data.hum);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: "top" as const } },
    scales: {
      x: { ticks: { maxTicksLimit: 8 } },
      y: { beginAtZero: false },
    },
    animation: { duration: 0 }, // Performa lebih lancar untuk real-time
  };

  const getChartConfig = (label: string, dataKey: string, color: string) => ({
    labels: history.map((h) =>
      new Date(h.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    datasets: [
      {
        label: label,
        data: history.map((h) => h[dataKey]),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  });

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
    animation: { duration: 0 },
  };

  return (
    <div
      className={`w-full p-4 transition-opacity md:p-6 ${loading ? "opacity-50" : "opacity-100"}`}
    >
      <h2 className="text-2xl font-bold">Monitoring: {selectedRoomId}</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl font-bold">Temperature Palka</h2>
          <GaugeComponent
            minValue={-10} // Menyesuaikan suhu palka bisa minus
            maxValue={50} // Batas atas suhu palka
            value={data.temp}
            type="semicircle"
            arc={{
              width: 0.2,
              padding: 0.02,
              subArcs: [
                { limit: 20, color: "#5BE12C" },
                { limit: 40, color: "#F5CD19" },
                { color: "#EA4228" },
              ],
            }}
            labels={{
              valueLabel: { hide: true },
              tickLabels: {
                hideMinMax: true, // Menghilangkan label angka min/max
                ticks: [], // Menghilangkan semua tick label
              },
            }}
            pointer={{
              type: "needle",
              elastic: true,
              color: "#464646", // Warna pointer agar lebih kontras
            }}
          />

          {/* Warna div sekarang mengikuti variabel currentColor */}
          <div
            className="text-6xl font-black transition-colors duration-500"
            style={{ color: currentColor }}
          >
            {data.temp}
            <span className="ml-1 text-2xl">°C</span>
          </div>
          <div className="mt-4 h-40 w-full">
            <Line
              data={{
                labels: (history || []).map((h) =>
                  new Date(h.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ),
                datasets: [
                  {
                    label: "Temp Trend",
                    data: (history || []).map((h) => h.temp),
                    borderColor: "#EA4228",
                    backgroundColor: "rgba(234, 66, 40, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                  },
                ],
              }}
              options={{
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
                animation: { duration: 0 },
              }}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold">Humidity Palka</h2>

          <GaugeComponent
            minValue={0}
            maxValue={100}
            value={data.hum}
            type="semicircle"
            arc={{
              width: 0.2,
              padding: 0.02,
              subArcs: [
                { limit: 30, color: "#93C5FD" }, // Dry
                { limit: 70, color: "#3B82F6" }, // Normal
                { color: "#1E3A8A" }, // High Humidity
              ],
            }}
            labels={{
              valueLabel: { hide: true },
              tickLabels: {
                hideMinMax: true,
                ticks: [],
              },
            }}
            pointer={{
              type: "needle",
              elastic: true,
              color: "#464646",
            }}
          />

          <div
            className="text-6xl font-black transition-colors duration-500"
            style={{ color: currentHumColor }}
          >
            {data.hum}
            <span className="ml-1 text-2xl">%</span>
          </div>
          <div className="mt-4 h-40 w-full">
            <Line
              data={{
                labels: (history || []).map((h) =>
                  new Date(h.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                ),
                datasets: [
                  {
                    label: "Humidity Trend",
                    data: (history || []).map((h) => h.hum),
                    borderColor: "#1E88E5",
                    backgroundColor: "rgba(30, 136, 229, 0.1)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    ticks: { maxTicksLimit: 5, font: { size: 10 } },
                    grid: { display: false },
                  },
                  y: {
                    ticks: {
                      font: { size: 10 },
                      callback: (value) => `${value}%`,
                    },
                    min: 0,
                    max: 100,
                  },
                },
                animation: { duration: 0 },
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

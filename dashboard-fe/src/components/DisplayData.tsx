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
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRoomId) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        const [resRooms, resTrend] = await Promise.all([
          fetch(`http://localhost:4000/api/rooms`),
          fetch(`http://localhost:4000/api/rooms/${selectedRoomId}/trend`),
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

    // HANDLER 1: Menerima data sensor normal
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
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return updated.filter((d) => new Date(d.timestamp) >= oneDayAgo);
        });
      }
    };

    // HANDLER 2: Menerima sinyal "Disconnected" (0-kan data)
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
    if (temp <= 20) return "#5BE12C";
    if (temp <= 40) return "#F5CD19";
    return "#EA4228";
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
      <h2 className="mb-4 text-2xl font-bold">Monitoring: {selectedRoomId}</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card Temperature */}
        <Card>
          <h2 className="mb-2 text-xl font-bold">Temperature Palka</h2>
          <GaugeComponent
            value={data.temp}
            minValue={-10}
            maxValue={100}
            arc={{
              width: 0.2,
              padding: 0.02,
              subArcs: [
                { limit: 55, color: "#5BE12C" }, // 0 - 55: Aman (Hijau)
                { limit: 60, color: "#FB923C" }, // 55 - 60: Warning Level 1 (Oranye Muda)
                { limit: 65, color: "#EA580C" }, // 60 - 65: Warning Level 2 (Oranye Tua)
                { color: "#DC2626" }, // > 65: Emergency (Merah)
              ],
            }}
            labels={{
              valueLabel: {
                hide: true, // Ini akan menyembunyikan angka di dalam gauge
              },
              tickLabels: {
                hideMinMax: false, // Set ke true jika ingin sembunyikan angka 0 dan 100 juga
              },
            }}
          />
          <div
            className="my-4 text-5xl font-black"
            style={{ color: getTempColor(data.temp) }}
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
            arc={{
              subArcs: [
                { limit: 30, color: "#93C5FD" },
                { limit: 70, color: "#3B82F6" },
                { color: "#1E3A8A" },
              ],
            }}
            labels={{
              valueLabel: {
                hide: true,
              },
              // tickLabels: {
              //   hideMinMax: false, // Set ke true jika ingin sembunyikan angka 0 dan 100 juga
              // },
            }}
          />
          <div
            className="my-4 text-5xl font-black"
            style={{ color: getHumColor(data.hum) }}
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
    </div>
  );
}

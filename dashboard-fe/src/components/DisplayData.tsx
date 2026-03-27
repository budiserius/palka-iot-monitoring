"use client";
import { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
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
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

import dynamic from "next/dynamic";
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

// 1. Update Limits sesuai logika terbaru
const LIMITS = {
  TEMP_ALARM_1: 55,
  TEMP_ALARM_2: 60,
  TEMP_EMERGENCY: 65,
  SAFE_MAX: 54.9,
};

type CardProps = { children: ReactNode };

function Card({ children }: CardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 p-6 shadow-lg">
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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // 2. Logic Label Risiko Terbaru
  const riskInfo = useMemo(() => {
    const { temp } = data;
    if (temp === 0) return { label: "OFFLINE", color: "#6b7280" };
    if (temp >= LIMITS.TEMP_EMERGENCY)
      return { label: "EMERGENCY WARNING", color: "#dc2626" };
    if (temp >= LIMITS.TEMP_ALARM_2)
      return { label: "ALARM LEVEL 2", color: "#ea580c" };
    if (temp >= LIMITS.TEMP_ALARM_1)
      return { label: "ALARM LEVEL 1", color: "#eab308" };
    return { label: "SAFE", color: "#22c55e" };
  }, [data.temp]);

  const fetchData = useCallback(async () => {
    if (!selectedRoomId) return;
    setLoading(true);
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
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, backendUrl]);

  useEffect(() => {
    fetchData();

    const handleUpdate = (newData: any) => {
      if (newData.room_id === selectedRoomId) {
        const payload = {
          temp: newData.temp,
          hum: newData.hum || newData.humidity,
          timestamp: newData.timestamp || new Date(),
        };
        setData({ temp: payload.temp, hum: payload.hum });
        setHistory((prev) => [...prev, payload].slice(-100)); // Simpan 100 titik terakhir
      }
    };

    const handleStatusUpdate = (statusData: any) => {
      if (
        statusData.room_id === selectedRoomId &&
        statusData.status === "Disconnected"
      ) {
        setData({ temp: 0, hum: 0 });
      }
    };

    socket.on(`sensor-update`, handleUpdate);
    socket.on("room-status-update", handleStatusUpdate);

    return () => {
      socket.off(`sensor-update`, handleUpdate);
      socket.off("room-status-update", handleStatusUpdate);
    };
  }, [selectedRoomId, fetchData]);

  if (!selectedRoomId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-500 italic">
        Silahkan pilih ruangan untuk memantau data secara real-time.
      </div>
    );
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#4b5563", size: 10 } },
      y: { grid: { color: "#1f2937" }, ticks: { color: "#4b5563", size: 10 } },
    },
  };

  return (
    <div
      className={`w-full p-4 transition-all md:p-8 ${loading ? "opacity-30" : "opacity-100"}`}
    >
      {/* Header & Status Indicator */}
      <div className="mb-8 flex flex-col justify-between gap-4 uppercase md:flex-row md:items-center">
        <h2 className="text-xl font-black tracking-tight">
          Room: <span className="">{selectedRoomId}</span>
        </h2>

        <div className="bg-opacity-10 flex items-center gap-3 rounded-sm px-6 transition-colors">
          <span
            className="text-sm font-black tracking-widest"
            style={{ color: riskInfo.color }}
          >
            {riskInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Temperature Gauge & Chart */}
        <Card>
          <p className="mb-4 text-xs font-bold tracking-widest uppercase">
            Live Temperature
          </p>
          <GaugeComponent
            value={data.temp}
            minValue={0}
            maxValue={100}
            arc={{
              width: 0.15,
              padding: 0.02,
              subArcs: [
                { limit: LIMITS.TEMP_ALARM_1, color: "#22c55e" }, // Safe < 55
                { limit: LIMITS.TEMP_ALARM_2, color: "#eab308" }, // Level 1: 55-60
                { limit: LIMITS.TEMP_EMERGENCY, color: "#ea580c" }, // Level 2: 60-65
                { color: "#dc2626" }, // Emergency > 65
              ],
            }}
            labels={{
              valueLabel: { hide: true },
              tickLabels: {
                type: "inner",
                ticks: [{ value: 55 }, { value: 60 }, { value: 65 }],
              },
            }}
          />
          <div className="my-2 flex flex-col items-center">
            <span
              className="text-6xl font-black tracking-tighter"
              style={{ color: riskInfo.color }}
            >
              {data.temp}
              <span className="ml-1 text-2xl font-normal text-gray-500">
                °C
              </span>
            </span>
          </div>
          <div className="mt-4 h-48 w-full">
            <Line
              data={{
                labels: history.map((h) =>
                  new Date(h.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                ),
                datasets: [
                  {
                    data: history.map((h) => h.temp),
                    borderColor: riskInfo.color,
                    backgroundColor: `${riskInfo.color}33`,
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

        {/* Humidity Gauge & Chart */}
        <Card>
          <p className="mb-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
            Humidity
          </p>
          <GaugeComponent
            value={data.hum}
            minValue={0}
            maxValue={100}
            arc={{
              width: 0.15,
              padding: 0.02,
              subArcs: [
                { limit: 20, color: "#0ea5e9" },
                { limit: 40, color: "#0284c7" },
                { limit: 60, color: "#0369a1" },
                { limit: 80, color: "#075985" },
                { color: "#0c4a6e" },
              ],
            }}
            labels={{ valueLabel: { hide: true } }}
          />
          <div className="my-2 flex flex-col items-center">
            <span className="text-6xl font-black tracking-tighter text-sky-500">
              {data.hum}
              <span className="ml-1 text-2xl font-normal text-gray-500">%</span>
            </span>
          </div>
          <div className="mt-4 h-48 w-full">
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
                    borderColor: "#0ea5e9",
                    backgroundColor: "rgba(14, 165, 233, 0.1)",
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

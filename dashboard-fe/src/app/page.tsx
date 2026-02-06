// import HeaderDashboard from "@/components/HeaderDashboard";
// import ListRoom from "@/components/ListRoom";

// export default function Home() {
//   return (
//     <main className="min-h-screen">
//       <HeaderDashboard />
//       <ListRoom />
//     </main>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Thermometer, Droplets, Activity } from "lucide-react";

const BACKEND_URL = "http://localhost:4000";

export default function ShipDashboard() {
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Ambil Data Awal (Initial Load)
    const fetchInitialData = async () => {
      try {
        const [roomsRes, logsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/rooms`),
          axios.get(`${BACKEND_URL}/api/logs/Room-1`), // Default Room-1
        ]);

        if (roomsRes.data.length > 0) {
          setRealtimeData(roomsRes.data[0].last_reading);
        }

        // Transformasi data bucket MongoDB ke format Chart
        const formattedLogs = logsRes.data.flatMap((bucket: any) =>
          bucket.measurements.map((m: any) => ({
            time: new Date(m.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            temp: m.t,
            hum: m.h,
          })),
        );
        setChartData(formattedLogs.slice(-20)); // Ambil 20 data terakhir
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchInitialData();

    // 2. Hubungkan ke WebSocket (Real-time Update)
    const socket = io(BACKEND_URL);

    socket.on("sensor-update", (payload) => {
      // Update Gauge
      setRealtimeData(payload);

      // Update Line Chart secara reaktif
      setChartData((prev) => {
        const newData = {
          time: new Date(payload.ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          temp: payload.temp,
          hum: payload.hum,
        };
        const updated = [...prev, newData];
        return updated.slice(-20); // Tetap jaga maksimal 20 titik di grafik
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading)
    return <div className="p-10 text-white">Loading Dashboard Kapal...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Activity className="text-blue-500" /> Monitoring Palka Kapal
        </h1>
      </header>

      {/* GAUGE SECTION */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3 text-orange-400">
            <Thermometer />{" "}
            <span className="text-sm font-semibold tracking-wider uppercase">
              Temperature
            </span>
          </div>
          <div className="font-mono text-6xl tracking-tighter">
            {realtimeData?.temp ?? "--"}
            <span className="text-2xl text-slate-500">°C</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3 text-blue-400">
            <Droplets />{" "}
            <span className="text-sm font-semibold tracking-wider uppercase">
              Humidity
            </span>
          </div>
          <div className="font-mono text-6xl tracking-tighter">
            {realtimeData?.hum ?? "--"}
            <span className="text-2xl text-slate-500">%</span>
          </div>
        </div>
      </div>

      {/* LINE CHART SECTION */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-6 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Temperature & Humidity Trends
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                }}
                itemStyle={{ fontSize: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#fb923c"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="hum"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

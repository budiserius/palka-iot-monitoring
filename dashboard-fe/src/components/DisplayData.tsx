"use client";
import { useState, useEffect, ReactNode } from "react";
import { socket } from "@/lib/socket";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import dynamic from "next/dynamic";
const GaugeComponent = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

type CardProps = { children: ReactNode };

ChartJS.register(ArcElement, Tooltip, Legend);

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRoomId) return;

    // A. Ambil data terakhir dari DB agar tidak 0 saat pertama klik
    setLoading(true);
    fetch(`http://localhost:4000/api/rooms`)
      .then((res) => res.json())
      .then((rooms: any[]) => {
        const current = rooms.find((r) => r.room_id === selectedRoomId);
        if (current?.last_reading) {
          setData({
            temp: current.last_reading.temp || 0,
            hum: current.last_reading.humidity || 0,
          });
        }
        setLoading(false);
      });

    // B. Listen data real-time
    const handleUpdate = (newData: any) => {
      if (newData.room_id === selectedRoomId) {
        setData({ temp: newData.temp, hum: newData.hum });
      }
    };

    socket.on("sensor-update", handleUpdate);

    return () => {
      // Perbaikan: Hapus listener spesifik agar tidak mengganggu komponen lain
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
        </Card>
      </div>
    </div>
  );
}

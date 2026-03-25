"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { FaCloudDownloadAlt } from "react-icons/fa";

const socket: Socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`);

interface AlarmLog {
  id: string | number;
  room_id: string;
  status: string;
  timestamp: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function LogAlarmSection() {
  const [logs, setLogs] = useState<AlarmLog[]>([]);

  // 1. Fungsi Helper untuk Format Status (Menghilangkan "Connected" -> "Safe")
  const formatStatus = (status: string) => {
    if (status === "Connected") return "Safe";
    return status;
  };

  const deleteLog = async (id: string | number) => {
    const isConfirmed = window.confirm(
      "Do you really want to delete this alarm log?",
    );
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${backendUrl}/api/rooms/alarms/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLogs((prev) => prev.filter((log) => log.id !== id));
        alert("Alarm log deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || "Server error"}`);
      }
    } catch (err) {
      alert("Failed to connect to the server.");
    }
  };

  const downloadLogs = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/rooms/alarms`);
      if (!response.ok) throw new Error("Failed to retrieve data.");

      const data = await response.json();
      if (data.length === 0) {
        alert("There is no log data available.");
        return;
      }

      const headers = ["Room ID", "Risk Level", "Value", "Timestamp"];
      const rows = data.map((log: any) => [
        log.room_id,
        formatStatus(log.status),
        log.value || 0,
        new Date(log.timestamp).toLocaleString(),
      ]);

      const csvContent =
        "\ufeff" +
        [headers.join(","), ...rows.map((row: any) => row.join(","))].join(
          "\n",
        );

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Log_Risk_Alarm_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } catch (err) {
      alert("Failed to download log.");
    }
  };

  useEffect(() => {
    const fetchAlarmHistory = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/rooms/alarms`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const formattedLogs: AlarmLog[] = data.map((log: any) => ({
          id: log._id,
          room_id: log.room_id,
          status: formatStatus(log.status),
          timestamp: new Date(log.timestamp).toLocaleTimeString(),
        }));

        setLogs(formattedLogs);
      } catch (err) {
        console.error("Failed to fetch alarm history:", err);
      }
    };

    fetchAlarmHistory();

    socket.on("new-alarm", (data: any) => {
      setLogs((prevLogs) => {
        const newLog: AlarmLog = {
          id: data._id,
          room_id: data.room_id,
          status: formatStatus(data.status),
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
        };
        return [newLog, ...prevLogs].slice(0, 50);
      });
    });

    socket.on("alarm-deleted", (deletedId: string) => {
      setLogs((prev) => prev.filter((log) => log.id !== deletedId));
    });

    return () => {
      socket.off("new-alarm");
      socket.off("alarm-deleted");
    };
  }, []);

  // 2. Update Warna Berdasarkan Logika Risk Level Baru
  const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes("critical")) return "text-red-600 font-bold animate-pulse";
    if (s.includes("high risk")) return "text-orange-600 font-bold";
    if (s.includes("moderate")) return "text-orange-400";
    if (s.includes("low risk")) return "text-blue-500";
    if (s.includes("disconnected")) return "text-gray-400";
    return "text-green-500"; // Untuk "Safe" atau "Normal"
  };

  return (
    <div className="w-80 border-gray-200 p-6 max-md:hidden md:flex md:h-[calc(100vh-120px)] md:flex-col md:border-l">
      <div className="mb-4 flex items-center justify-between border-b pb-2">
        <h2 className="text-2xl font-bold">Log Alarm</h2>
        <button
          onClick={downloadLogs}
          className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-50"
          title="Download CSV Reports"
        >
          <FaCloudDownloadAlt size={24} />
        </button>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-gray-300 flex-1 space-y-3 overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada aktivitas...</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="group relative border-b border-gray-100 pb-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Room: {log.room_id}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {log.timestamp}
                  </span>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                    title="Delete log"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p
                className={`text-xs font-medium ${getStatusColor(log.status)}`}
              >
                {log.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

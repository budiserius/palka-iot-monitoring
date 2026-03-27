"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { FaCloudDownloadAlt, FaTrash } from "react-icons/fa";

// 1. Definisikan tipe di luar komponen
type RoomStatus =
  | "Safe"
  | "Alarm Level 1"
  | "Alarm Level 2"
  | "Emergency Warning"
  | "Disconnected";

interface AlarmLog {
  id: string | number;
  room_id: string;
  status: RoomStatus;
  value?: number;
  timestamp: string;
}

export default function LogAlarmSection() {
  const [logs, setLogs] = useState<AlarmLog[]>([]);

  // 2. Memoize URL untuk mencegah perubahan ukuran dependency array
  const envConfig = useMemo(
    () => ({
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "",
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "",
    }),
    [],
  );

  // 3. Helper format status (Memoized agar stabil)
  const formatStatus = useCallback((status: string): RoomStatus => {
    if (status === "Connected" || !status) return "Safe";
    const s = status.toLowerCase();
    if (s.includes("emergency")) return "Emergency Warning";
    if (s.includes("level 2")) return "Alarm Level 2";
    if (s.includes("level 1")) return "Alarm Level 1";
    if (s.includes("disconnected")) return "Disconnected";
    return "Safe";
  }, []);

  // 4. Fungsi Delete dengan useCallback
  const deleteLog = useCallback(
    async (id: string | number) => {
      const isConfirmed = window.confirm("Hapus log alarm ini?");
      if (!isConfirmed) return;

      try {
        const response = await fetch(
          `${envConfig.backendUrl}/api/rooms/alarms/${id}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          setLogs((prev) => prev.filter((log) => log.id !== id));
        }
      } catch (err) {
        alert("Terjadi kesalahan koneksi.");
      }
    },
    [envConfig.backendUrl],
  );

  // 5. Fungsi Download dengan useCallback
  const downloadLogs = useCallback(async () => {
    try {
      const response = await fetch(`${envConfig.backendUrl}/api/rooms/alarms`);
      if (!response.ok) throw new Error("Gagal mengambil data.");

      const data = await response.json();
      if (data.length === 0) return alert("Data kosong.");

      const headers = ["Room ID", "Status", "Temp (°C)", "Timestamp"];
      const rows = data.map((log: any) => [
        log.room_id,
        formatStatus(log.status),
        log.value || log.temp || 0,
        new Date(log.timestamp).toLocaleString("id-ID"),
      ]);

      const csvContent =
        "\ufeff" +
        [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Log_Alarm_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengunduh log.");
    }
  }, [envConfig.backendUrl, formatStatus]);

  // 6. Style Mapping (Memoized)
  const getStatusStyle = useCallback((status: RoomStatus): string => {
    const styles: Record<RoomStatus, string> = {
      "Emergency Warning": "text-red-600 font-bold animate-pulse uppercase",
      "Alarm Level 2": "text-orange-600 font-semibold",
      "Alarm Level 1": "text-yellow-500 font-medium",
      Disconnected: "text-gray-400 italic",
      Safe: "text-green-500",
    };
    return styles[status] || styles["Safe"];
  }, []);

  // 7. Core Logic: Fetch & Socket
  useEffect(() => {
    if (!envConfig.backendUrl) return;

    // Inisialisasi Socket di dalam useEffect agar stabil
    const socket: Socket = io(envConfig.socketUrl);

    const fetchAlarmHistory = async () => {
      try {
        const response = await fetch(
          `${envConfig.backendUrl}/api/rooms/alarms`,
        );
        const data = await response.json();
        const formatted = data.map((log: any) => ({
          id: log._id,
          room_id: log.room_id,
          status: formatStatus(log.status),
          value: log.value || log.temp,
          timestamp: new Date(log.timestamp).toLocaleTimeString("id-ID"),
        }));
        setLogs(formatted);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };

    fetchAlarmHistory();

    socket.on("new-alarm", (data: any) => {
      setLogs((prev) => {
        const newLog: AlarmLog = {
          id: data._id || Date.now(),
          room_id: data.room_id,
          status: formatStatus(data.status),
          value: data.value || data.temp,
          timestamp: new Date(data.timestamp || new Date()).toLocaleTimeString(
            "id-ID",
          ),
        };
        return [newLog, ...prev].slice(0, 50);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [envConfig, formatStatus]); // Dependency array stabil menggunakan objek memoized

  return (
    <div className="w-80 gap-6 border-gray-800 p-6 max-md:hidden md:flex md:h-[calc(100vh-120px)] md:flex-col md:border-l">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Alarm Logs</h2>
        </div>
        <button
          onClick={downloadLogs}
          className="rounded-fulltransition-colors hover:bg-gray-900"
        >
          <FaCloudDownloadAlt size={24} className="" />
        </button>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-gray-800 flex-1 space-y-4 overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm italic opacity-30">
            No activity detected...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="group relative rounded-sm border border-gray-900 p-3 transition-all hover:border-gray-700"
            >
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Room {log.room_id}</span>
                  <span
                    className={`mt-1 text-[11px] ${getStatusStyle(log.status)}`}
                  >
                    {log.status} {log.value ? `(${log.value}°C)` : ""}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-mono text-[9px] text-gray-500">
                    {log.timestamp}
                  </span>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

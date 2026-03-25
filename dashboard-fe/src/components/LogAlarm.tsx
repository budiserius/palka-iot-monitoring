import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const socket: Socket = io("http://localhost:4000");

interface AlarmLog {
  id: string | number;
  room_id: string;
  status: string;
  timestamp: string;
}

interface SocketData {
  room_id: string;
  status: string;
  timestamp: string | Date;
}

export default function LogAlarmSection() {
  const [logs, setLogs] = useState<AlarmLog[]>([]);

  useEffect(() => {
    const fetchAlarmHistory = async () => {
      try {
        const response = await fetch(
          "http://localhost:4000/api/rooms/all/alarms",
        );

        // Cek jika response bukan JSON (misal error 404 HTML)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const formattedLogs: AlarmLog[] = data.map((log: any) => ({
          id: log._id || Math.random(),
          room_id: log.room_id,
          status: log.status === "Connected" ? "Normal" : log.status,
          timestamp: new Date(log.timestamp).toLocaleTimeString(),
        }));

        setLogs(formattedLogs);
      } catch (err) {
        console.error("Failed to fetch alarm history:", err);
      }
    };

    fetchAlarmHistory();

    socket.on("room-status-update", (data: SocketData) => {
      setLogs((prevLogs) => {
        const displayStatus =
          data.status === "Connected" ? "Normal" : data.status;

        const newLog: AlarmLog = {
          id: Date.now(),
          room_id: data.room_id,
          status: displayStatus,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
        };

        return [newLog, ...prevLogs].slice(0, 50);
      });
    });

    return () => {
      socket.off("room-status-update");
    };
  }, []);

  const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes("emergency")) return "text-red-500";
    if (s.includes("warning")) return "text-yellow-500";
    if (s.includes("disconnected")) return "text-gray-400";
    return "text-green-500";
  };

  return (
    <div className="w-80 p-6 max-md:bottom-0 max-md:hidden max-md:w-full max-md:border-t md:flex md:h-[calc(100vh-120px)] md:flex-col md:border-l">
      <h2 className="mb-4 border-b pb-2 text-2xl font-bold">Log Alarm</h2>

      <div className="scrollbar-thin scrollbar-thumb-gray-300 flex-1 space-y-3 overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Belum ada aktivitas...</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="animate-in fade-in slide-in-from-right-4 border-b border-gray-100 pb-2 duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Room: {log.room_id}
                </span>
                <span className="text-[10px] text-gray-400">
                  {log.timestamp}
                </span>
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

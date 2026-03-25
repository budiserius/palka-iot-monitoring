import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Button from "./atoms/Button";
import { FaCloudDownloadAlt } from "react-icons/fa";

const socket: Socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`);

interface AlarmLog {
  id: string | number;
  room_id: string;
  status: string;
  timestamp: string;
}

interface AlarmLogData {
  id: string | number;
  room_id: string;
  status: string;
  value: number;
  timestamp: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function LogAlarmSection() {
  const [logs, setLogs] = useState<AlarmLog[]>([]);

  const deleteLog = async (id: string | number) => {
    const isConfirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus log alarm ini?",
    );

    if (!isConfirmed) return; // Batalkan jika user klik 'Cancel'

    try {
      const response = await fetch(`${backendUrl}/api/rooms/alarms/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLogs((prev) => prev.filter((log) => log.id !== id));
        alert("✅ Log alarm berhasil dihapus!");
      } else {
        const errorData = await response.json();
        alert(
          `❌ Gagal menghapus: ${errorData.error || "Terjadi kesalahan server"}`,
        );
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("❌ Gagal terhubung ke server. Pastikan backend menyala.");
    }
  };

  const downloadLogs = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/rooms/alarms`);
      if (!response.ok) throw new Error("Gagal mengambil data untuk download");

      const data = await response.json();

      if (data.length === 0) {
        alert("⚠️ Tidak ada data log untuk didownload.");
        return;
      }

      // 1. Definisikan Header CSV
      const headers = ["ID Ruangan", "Status", "Nilai", "Waktu"];

      // 2. Map data ke baris CSV
      const rows = data.map((log: any) => [
        log.room_id,
        log.status,
        log.value || 0,
        new Date(log.timestamp).toLocaleString(),
      ]);

      // 3. Gabungkan Header dan Baris
      const csvContent = [
        headers.join(","),
        ...rows.map((row: any) => row.join(",")),
      ].join("\n");

      // 4. Buat Blob dan Link Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `log_alarm_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("✅ File CSV berhasil diunduh!");
    } catch (err) {
      console.error("Download failed:", err);
      alert("❌ Gagal mendownload log.");
    }
  };

  useEffect(() => {
    const fetchAlarmHistory = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/rooms/alarms`);

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

    socket.on("new-alarm", (data: any) => {
      setLogs((prevLogs) => {
        const newLog: AlarmLog = {
          id: data._id, // Gunakan ID dari MongoDB
          room_id: data.room_id,
          status: data.status === "Connected" ? "Normal" : data.status,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
        };
        return [newLog, ...prevLogs].slice(0, 50);
      });
    });

    // Listener untuk sinkronisasi jika user lain menghapus alarm (Opsional)
    socket.on("alarm-deleted", (deletedId: string) => {
      setLogs((prev) => prev.filter((log) => log.id !== deletedId));
    });

    return () => {
      socket.off("new-alarm");
      socket.off("alarm-deleted");
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
      <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
        Log Alarm <FaCloudDownloadAlt onClick={downloadLogs} />
      </h2>

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
                <span className="text-sm font-semibold">
                  Room: {log.room_id}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {log.timestamp}
                  </span>
                  {/* Tombol Delete muncul saat hover */}
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
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

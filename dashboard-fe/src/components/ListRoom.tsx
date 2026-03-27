"use client";
import { FaAngleUp } from "react-icons/fa";
import Button from "./atoms/Button";
import { useState, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import {
  MdLink,
  MdLinkOff,
  MdOutlineWarningAmber,
  MdErrorOutline,
} from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";

// 1. Update Type sesuai logika baru
type RoomStatus =
  | "Safe"
  | "Alarm Level 1"
  | "Alarm Level 2"
  | "Emergency Warning"
  | "Disconnected";

interface Room {
  id: string;
  room_id: string;
  status: RoomStatus;
  last_active?: string;
}

export default function ListRoom({
  onSelectRoom,
}: {
  onSelectRoom: (id: string) => void;
}) {
  const [isRollUp, setIsRollUp] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const lastStatusRef = useRef<Record<string, RoomStatus>>({});
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // 2. Update Styling & Animasi
  const statusStyles: Record<RoomStatus, string> = {
    Safe: "text-green-500",
    "Alarm Level 1": "text-yellow-500",
    "Alarm Level 2": "text-orange-600 animate-pulse",
    "Emergency Warning": "text-red-600 animate-ping font-bold",
    Disconnected: "text-gray-500",
  };

  const triggerAlert = (room: string, status: RoomStatus) => {
    const isEmergency = status === "Emergency Warning";

    // Minimalist colors: deep dark backgrounds with sharp borders
    const bgColor = isEmergency ? "bg-red-950" : "bg-zinc-900";
    const borderColor = isEmergency ? "border-red-600" : "border-zinc-700";

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } flex w-full max-w-sm overflow-hidden rounded-md border ${borderColor} ${bgColor} pointer-events-auto shadow-2xl`}
        >
          <div className="flex-1 p-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">
                System Alert
              </p>
              <p className="mt-1 text-sm font-bold text-white uppercase">
                Room: {room}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Status:{" "}
                <span
                  className={
                    isEmergency ? "font-bold text-red-500" : "text-orange-400"
                  }
                >
                  {status}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex items-center justify-center border-l border-white/10 px-6 text-[10px] font-black tracking-widest text-gray-400 uppercase transition-colors hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>
      ),
      {
        id: `alert-${room}`,
        duration: isEmergency ? Infinity : 5000,
        style: {
          background: "transparent",
          padding: 0,
          boxShadow: "none",
        },
      },
    );
  };

  // 3. Update Icon mapping
  const StatusIcon = ({ status }: { status: RoomStatus }) => {
    switch (status) {
      case "Safe":
        return <MdLink className={`text-xl ${statusStyles[status]}`} />;
      case "Disconnected":
        return <MdLinkOff className={`text-xl ${statusStyles[status]}`} />;
      case "Emergency Warning":
        return <MdErrorOutline className={`text-xl ${statusStyles[status]}`} />;
      default:
        return (
          <MdOutlineWarningAmber
            className={`text-xl ${statusStyles[status]}`}
          />
        );
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    fetch(`${backendUrl}/api/rooms`)
      .then((res) => res.json())
      .then((data: any[]) => {
        const formattedRooms = data.map((item) => {
          const lastTs = item.last_reading?.timestamp;
          const isTimeout =
            !lastTs ||
            new Date().getTime() - new Date(lastTs).getTime() > 60000;

          // Menggunakan status langsung dari backend hasil kalkulasi logika baru
          let initialStatus: RoomStatus = isTimeout
            ? "Disconnected"
            : item.status || "Safe";

          lastStatusRef.current[item.room_id] = initialStatus;
          return {
            id: item._id,
            room_id: item.room_id,
            status: initialStatus,
            last_active: lastTs,
          };
        });
        setRooms(formattedRooms);
      });

    socket.on("room-status-update", (data) => {
      const newStatus = data.status as RoomStatus;
      const prevStatus = lastStatusRef.current[data.room_id];

      // 4. Update Logika Trigger Alert (Kapan user harus diberi notifikasi)
      const warningLevels: RoomStatus[] = [
        "Alarm Level 1",
        "Alarm Level 2",
        "Emergency Warning",
      ];

      const isDangerous = warningLevels.includes(newStatus);

      // Hanya trigger jika status memburuk/berubah ke arah bahaya
      if (isDangerous && newStatus !== prevStatus) {
        triggerAlert(data.room_id, newStatus);
      }

      lastStatusRef.current[data.room_id] = newStatus;

      setRooms((prevRooms) => {
        const roomExists = prevRooms.find((r) => r.room_id === data.room_id);
        if (roomExists) {
          return prevRooms.map((room) =>
            room.room_id === data.room_id
              ? { ...room, status: newStatus, last_active: data.timestamp }
              : room,
          );
        }
        return [
          ...prevRooms,
          { id: data.id, room_id: data.room_id, status: newStatus },
        ];
      });
    });

    return () => {
      socket.off("room-status-update");
    };
  }, [backendUrl]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="w-64 border-gray-800 p-6 max-md:fixed max-md:bottom-0 max-md:w-full max-md:border-t max-md:bg-black md:flex md:h-[calc(100vh-120px)] md:flex-col md:justify-between md:border-r">
        <div onClick={() => setIsRollUp(!isRollUp)}>
          <h2 className="flex cursor-pointer items-center justify-between text-xl font-bold tracking-tight">
            MONITORING
            <FaAngleUp
              className={
                "transition-transform md:hidden " +
                (isRollUp ? "rotate-0" : "rotate-180")
              }
            />
          </h2>
          <div
            className={
              "mt-6 flex flex-col gap-3 overflow-y-auto max-md:grid max-md:grid-cols-2 " +
              (isRollUp ? "max-md:max-h-96" : "max-md:max-h-0")
            }
          >
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Waiting for data...
              </p>
            ) : (
              rooms.map((room) => (
                <div key={room.room_id} className="w-full">
                  <Button onClick={() => onSelectRoom(room.room_id)}>
                    <span className="text-sm font-medium">{room.room_id}</span>
                    <StatusIcon status={room.status} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-4 max-md:hidden">
          <p className="mb-4 text-xs font-bold tracking-widest uppercase">
            Legend
          </p>
          <ul className="space-y-3">
            {(Object.keys(statusStyles) as RoomStatus[]).map((label) => (
              <li key={label} className="flex items-center gap-3 text-xs">
                <StatusIcon status={label} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

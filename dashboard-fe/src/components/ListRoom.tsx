"use client";
import { FaAngleUp } from "react-icons/fa";
import Button from "./atoms/Button";
import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";

type RoomStatus =
  | "Connected"
  | "Disconnected"
  | "Warning Level 1"
  | "Warning Level 2"
  | "Emergency";

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

  const statusColors: Record<RoomStatus, string> = {
    Connected: "bg-green-500",
    Disconnected: "bg-gray-500",
    "Warning Level 1": "bg-orange-400 animate-pulse", // Level 1: Oranye berkedip
    "Warning Level 2": "bg-orange-600 animate-pulse", // Level 2: Oranye tua berkedip
    Emergency: "bg-red-600 animate-ping", // Emergency: Merah berdenyut kencang
  };

  useEffect(() => {
    fetch(`http://localhost:4000/api/rooms`)
      .then((res) => res.json())
      .then((data: any[]) => {
        const formattedRooms: Room[] = data.map((item) => {
          const temp = item.last_reading?.temp || 0;
          const lastTs = item.last_reading?.timestamp;
          const isTimeout =
            !lastTs ||
            new Date().getTime() - new Date(lastTs).getTime() > 60000;

          // Logika penentuan status awal yang sama dengan Backend
          let initialStatus: RoomStatus = "Disconnected";
          if (!isTimeout) {
            if (temp >= 65) initialStatus = "Emergency";
            else if (temp >= 60) initialStatus = "Warning Level 2";
            else if (temp >= 55) initialStatus = "Warning Level 1";
            else initialStatus = "Connected";
          }

          return {
            id: item._id,
            room_id: item.room_id,
            status: initialStatus,
            last_active: lastTs,
          };
        });
        setRooms(formattedRooms);
      });

    socket.on(
      "room-status-update",
      (data: {
        id: string;
        room_id: string;
        status: string;
        timestamp: string;
      }) => {
        setRooms((prevRooms) => {
          const roomExists = prevRooms.find((r) => r.room_id === data.room_id);
          const newStatus = data.status as RoomStatus;

          if (roomExists) {
            return prevRooms.map((room) =>
              room.room_id === data.room_id
                ? {
                    ...room,
                    id: data.id,
                    status: newStatus,
                    last_active: data.timestamp,
                  }
                : room,
            );
          } else {
            // Tambahkan ruangan baru secara dinamis jika terdeteksi (Auto-Discovery)
            return [
              ...prevRooms,
              {
                id: data.id,
                room_id: data.room_id,
                status: newStatus,
                last_active: data.timestamp,
              },
            ];
          }
        });
      },
    );

    // Bersihkan listener saat komponen tidak lagi digunakan
    return () => {
      socket.off("room-status-update");
    };
  }, []);

  return (
    <div className="w-60 p-6 max-md:absolute max-md:bottom-0 max-md:w-full max-md:border-t md:flex md:h-[calc(100vh-120px)] md:flex-col md:justify-between md:border-r">
      <div onClick={() => setIsRollUp(!isRollUp)}>
        <h2 className="flex cursor-pointer justify-between text-2xl font-bold">
          List Rooms{" "}
          <FaAngleUp
            className={"md:hidden " + (isRollUp ? "rotate-0" : "rotate-180")}
          />
        </h2>
        <div
          className={
            "mt-4 flex flex-col gap-3 max-md:grid max-md:grid-cols-2 max-md:overflow-hidden max-md:transition-all " +
            (isRollUp
              ? "opacity-100 max-md:max-h-96"
              : "opacity-100 max-md:max-h-0")
          }
        >
          {rooms.length === 0 ? (
            <p className="text-sm text-gray-400">Menunggu data...</p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="max-md:flex max-md:w-full max-md:justify-center"
              >
                <Button onClick={() => onSelectRoom(room.room_id)}>
                  <span className="truncate">{room.room_id}</span>
                  <div
                    className={
                      "aspect-square h-2 w-2 shrink-0 rounded-full " +
                      statusColors[room.status]
                    }
                    title={room.status}
                  />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div className="mt-auto max-md:hidden">
        <p className="mb-2 border-b font-bold">Status Legend</p>
        <ul className="space-y-2">
          {Object.entries(statusColors).map(([label, color]) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <div className={`aspect-square h-2 w-2 rounded-full ${color}`} />
              <p>{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

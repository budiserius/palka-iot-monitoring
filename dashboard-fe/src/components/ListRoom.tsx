"use client";
import { FaAngleUp } from "react-icons/fa";
import Button from "./atoms/Button";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

type RoomStatus = "Connected" | "Disconnected" | "Busy";

interface Room {
  id: string;
  name: string;
  status: RoomStatus;
}

export default function ListRoom() {
  const [isRollUp, setIsRollUp] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  const statusColors: Record<RoomStatus, string> = {
    Connected: "bg-green-500",
    Disconnected: "bg-red-500",
    Busy: "bg-yellow-500",
  };

  useEffect(() => {
    fetch("http://localhost:4000/api/rooms")
      .then((res) => res.json())
      .then((data: any[]) => {
        const formattedRooms: Room[] = data.map((item) => ({
          id: item.room_id,
          name: item.room_id,
          status: (item.last_reading?.timestamp &&
          new Date().getTime() -
            new Date(item.last_reading.timestamp).getTime() <
            300000
            ? "Connected"
            : "Disconnected") as RoomStatus, // Memaksa string menjadi tipe RoomStatus
        }));
        setRooms(formattedRooms);
      })
      .catch((err) => console.error("Failed to fetch rooms", err));

    socket.on(
      "room-status-update",
      (data: { room_id: string; status: string }) => {
        setRooms((prevRooms) => {
          const roomExists = prevRooms.find((r) => r.id === data.room_id);
          const newStatus = (
            data.status === "online" ? "Connected" : "Disconnected"
          ) as RoomStatus;

          if (roomExists) {
            return prevRooms.map((room) =>
              room.id === data.room_id ? { ...room, status: newStatus } : room,
            );
          } else {
            return [
              ...prevRooms,
              {
                id: data.room_id,
                name: data.room_id,
                status: newStatus,
              },
            ];
          }
        });
      },
    );

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
            <p className="text-sm text-gray-400">Loading rooms...</p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="max-md:flex max-md:w-full max-md:justify-center"
              >
                <Button onClick={() => alert(`Joined ${room.id}`)}>
                  {room.id}
                  <div
                    className={
                      "aspect-square h-2 w-2 rounded-full " +
                      statusColors[room.status]
                    }
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

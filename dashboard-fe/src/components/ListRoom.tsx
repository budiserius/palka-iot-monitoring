"use client";
import { FaAngleUp, FaDotCircle } from "react-icons/fa";
import Button from "./atoms/Button";

type RoomStatus = "Connected" | "Disconnected" | "Busy";

interface Room {
  id: string;
  name: string;
  status: RoomStatus;
}

const LIST_ROOM: Room[] = [
  {
    id: "1",
    name: "Palka Room A",
    status: "Connected",
  },
  {
    id: "2",
    name: "Palka Room B",
    status: "Disconnected",
  },
  {
    id: "3",
    name: "Palka Room C",
    status: "Connected",
  },
  {
    id: "4",
    name: "Palka Room D",
    status: "Busy",
  },
];

export default function ListRoom() {
  const statusColors = {
    Connected: "text-green-500",
    Disconnected: "text-red-500",
    Busy: "text-yellow-500",
  };
  return (
    <div className="w-60 p-6 max-md:absolute max-md:bottom-0 max-md:w-full max-md:border-t md:h-[calc(100vh-120px)] md:border-r">
      <h2 className="flex justify-between text-2xl font-bold">
        List Rooms <FaAngleUp className="md:hidden" />
      </h2>
      <div className="flex flex-col gap-3 max-md:grid max-md:grid-cols-2">
        {LIST_ROOM.map((room) => (
          <Button
            key={room.id}
            onClick={() => console.log(`Joined ${room.name}`)}
          >
            {room.name}
            <FaDotCircle
              className={statusColors[room.status] || "text-gray-400"}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}

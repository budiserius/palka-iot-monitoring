"use client";
import { FaAngleUp } from "react-icons/fa";
import Button from "./atoms/Button";
import { useState } from "react";

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
  const [isRollUp, setIsRollUp] = useState(false);
  const statusColors = {
    Connected: "bg-green-500",
    Disconnected: "bg-red-500",
    Busy: "bg-yellow-500",
  };
  return (
    <div className="w-60 p-6 max-md:absolute max-md:bottom-0 max-md:w-full max-md:border-t md:flex md:h-[calc(100vh-120px)] md:flex-col md:justify-between md:border-r">
      <div
        onClick={() => {
          setIsRollUp(!isRollUp);
        }}
      >
        <h2 className="flex justify-between text-2xl font-bold">
          List Rooms{" "}
          <FaAngleUp
            className={"md:hidden " + (isRollUp ? "rotate-0" : "rotate-180")}
          />
        </h2>
        <div
          className={
            "flex flex-col gap-3 max-md:grid max-md:grid-cols-2 max-md:overflow-hidden max-md:transition-all " +
            (isRollUp
              ? "opacity-100 max-md:max-h-96"
              : "opacity-100 max-md:max-h-0")
          }
        >
          {LIST_ROOM.map((room) => (
            <div
              key={room.id}
              className="max-md:flex max-md:w-full max-md:justify-center"
            >
              <Button onClick={() => alert(`Joined ${room.name}`)}>
                {room.name}
                <div
                  className={
                    "aspect-square h-2 w-2 rounded-full " +
                    statusColors[room.status]
                  }
                />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="max-md:hidden">
        <p className="font-bold">Information</p>
        <ul>
          <li className="flex items-center justify-start gap-3">
            <div
              className={"aspect-square h-2 w-2 rounded-full bg-green-500"}
            />
            <p>Connected</p>
          </li>
          <li className="flex items-center justify-start gap-3">
            <div className={"aspect-square h-2 w-2 rounded-full bg-red-500"} />
            <p>Disconnected</p>
          </li>
          <li className="flex items-center justify-start gap-3">
            <div className={"aspect-square h-2 w-2 rounded-full bg-red-500"} />
            <p>Busy</p>
          </li>
        </ul>
      </div>
    </div>
  );
}

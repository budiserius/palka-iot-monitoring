"use client";
import { FaAngleUp } from "react-icons/fa";
import Button from "./atoms/Button";
import { useState, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";
import { MdLink, MdLinkOff, MdOutlineWarningAmber } from "react-icons/md";
import toast, { Toaster } from "react-hot-toast";

type RoomStatus =
  | "Safe"
  | "Low Risk"
  | "Moderate Risk"
  | "High Risk"
  | "Critical"
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

  const statusStyles: Record<RoomStatus, string> = {
    Safe: "text-green-500",
    "Low Risk": "text-blue-400",
    "Moderate Risk": "text-yellow-500 animate-pulse",
    "High Risk": "text-orange-600 animate-pulse",
    Critical: "text-red-600 animate-ping",
    Disconnected: "text-gray-500",
  };
  const triggerAlert = (room: string, status: RoomStatus) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`⚠️ BAHAYA: ${room}`, {
        body: `Status saat ini: ${status}`,
      });
    }

    toast.error(
      (t) => (
        <>
          <div className="flex items-center justify-between rounded bg-red-600 px-3 py-2 text-white">
            <span className="text-sm font-medium">
              Danger Detected: Room {room} is {status}.
            </span>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="ml-2 font-bold text-white"
            >
              ✕
            </button>
          </div>
        </>
      ),
      {
        duration: 6000,
        id: `alert-${room}`,
      },
    );
  };

  const StatusIcon = ({ status }: { status: RoomStatus }) => {
    switch (status) {
      case "Safe":
      case "Low Risk":
        return <MdLink className={`text-xl ${statusStyles[status]}`} />;
      case "Disconnected":
        return <MdLinkOff className={`text-xl ${statusStyles[status]}`} />;
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
          const temp = item.last_reading?.temp || 0;
          const lastTs = item.last_reading?.timestamp;
          const isTimeout =
            !lastTs ||
            new Date().getTime() - new Date(lastTs).getTime() > 60000;

          let initialStatus: RoomStatus = "Disconnected";
          if (!isTimeout) {
            initialStatus = (item.status || "Safe") as RoomStatus;
          }

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
      const dangerLevels: RoomStatus[] = [
        "Moderate Risk",
        "High Risk",
        "Critical",
      ];
      const isDanger = dangerLevels.includes(newStatus);

      if (isDanger && newStatus !== prevStatus) {
        triggerAlert(data.room_id, newStatus);
      }

      lastStatusRef.current[data.room_id] = newStatus;

      setRooms((prevRooms) => {
        const roomExists = prevRooms.find((r) => r.room_id === data.room_id);
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
        }
        return [
          ...prevRooms,
          {
            id: data.id,
            room_id: data.room_id,
            status: newStatus,
            last_active: data.timestamp,
          },
        ];
      });
    });

    return () => {
      socket.off("room-status-update");
    };
  }, [backendUrl]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: "8px", background: "#333", color: "#fff" },
        }}
      />
      <div className="w-60 bg-black p-6 max-md:fixed max-md:bottom-0 max-md:w-full max-md:border-t md:flex md:h-[calc(100vh-120px)] md:flex-col md:justify-between md:border-r">
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
                  key={room.room_id}
                  className="max-md:flex max-md:w-full max-md:justify-center"
                >
                  <Button onClick={() => onSelectRoom(room.room_id)}>
                    <span className="truncate">{room.room_id}</span>
                    <StatusIcon status={room.status} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto max-md:hidden">
          <p className="mb-2 border-b font-bold">Status Legend</p>
          <ul className="space-y-2">
            {Object.keys(statusStyles).map((label) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <StatusIcon status={label as RoomStatus} />
                <p>{label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

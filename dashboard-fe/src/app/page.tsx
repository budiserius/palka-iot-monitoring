"use client";
import DisplayData from "@/components/DisplayData";
import HeaderDashboard from "@/components/HeaderDashboard";
import ListRoom from "@/components/ListRoom";
import { useState } from "react";

export default function Home() {
  const [activeRoom, setActiveRoom] = useState<string>("");
  return (
    <main className="min-h-screen">
      <HeaderDashboard />
      <div className="md:flex md:w-full">
        <ListRoom onSelectRoom={(id) => setActiveRoom(id)} />
        <DisplayData selectedRoomId={activeRoom} />
      </div>
    </main>
  );
}

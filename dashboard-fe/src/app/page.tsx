// import HeaderDashboard from "@/components/HeaderDashboard";
// import ListRoom from "@/components/ListRoom";

// export default function Home() {
//   return (
//     <main className="min-h-screen">
//       <HeaderDashboard />
//       <ListRoom />
//     </main>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Koneksi ke port backend 4000
    const socket = io("http://localhost:4000");

    socket.on("sensor-update", (payload) => {
      setData(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-10">
      <h1>Room: {data?.room_id || "Waiting..."}</h1>
      <div className="text-4xl">{data?.temp}°C</div>
      <div className="text-4xl">{data?.hum}%</div>
    </div>
  );
}

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });

let currentRide = null;

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("driver-online", () => {
    io.emit("admin-log", `🚕 Driver online (${socket.id})`);
  });

  socket.on("book-ride", (ride) => {
    currentRide = {
      ...ride,
      status: "REQUESTED"
    };
    io.emit("admin-log", `👤 User booked ride: ${ride.pickup} → ${ride.drop}`);
    io.emit("new-ride", currentRide);
  });

  socket.on("accept-ride", () => {
    if (!currentRide) return;
    currentRide.status = "ACCEPTED";
    io.emit("admin-log", "✅ Driver accepted ride");
    io.emit("ride-update", currentRide);
  });

  socket.on("start-ride", () => {
    if (!currentRide) return;
    currentRide.status = "STARTED";
    io.emit("admin-log", "▶️ Ride started");
    io.emit("ride-update", currentRide);
  });

  socket.on("end-ride", () => {
    if (!currentRide) return;
    currentRide.status = "COMPLETED";
    io.emit("admin-log", "🏁 Ride completed");
    io.emit("ride-update", currentRide);
    currentRide = null;
  });

  socket.on("disconnect", () => {
    io.emit("admin-log", `❌ Disconnected (${socket.id})`);
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});


const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

/* 🔥 HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("🚕 Booking Ride Server is LIVE");
});

let pendingOtps = {};
let riders = {};
let currentRide = null;

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("send-otp", ({ contact }) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pendingOtps[socket.id] = {
      contact,
      otp,
      expires: Date.now() + 2 * 60 * 1000
    };

    console.log("OTP:", otp);
    io.emit("admin-log", `🔐 OTP sent to ${contact} → ${otp}`);
    socket.emit("otp-sent");
  });

  socket.on("verify-otp", ({ otp }) => {
    const record = pendingOtps[socket.id];
    if (!record || record.otp !== otp || Date.now() > record.expires) {
      socket.emit("otp-result", { success: false, msg: "Invalid/Expired OTP" });
      return;
    }

    riders[socket.id] = { contact: record.contact };
    delete pendingOtps[socket.id];

    io.emit("admin-log", `✅ Rider verified: ${record.contact}`);
    socket.emit("otp-result", { success: true });
  });

  socket.on("book-ride", (ride) => {
    currentRide = { ...ride, status: "REQUESTED" };
    io.emit("new-ride", currentRide);
    io.emit("admin-log", "🚕 Ride booked");
  });

  socket.on("accept-ride", () => {
    if (!currentRide) return;
    currentRide.status = "ACCEPTED";
    io.emit("ride-update", currentRide);
    io.emit("admin-log", "✅ Ride accepted");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});

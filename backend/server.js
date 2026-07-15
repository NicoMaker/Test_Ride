// Entry point: crea server HTTP + Socket.IO, configura l'app e avvia il listener.
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { config } from "./src/config/env.js";
import { configureApp } from "./src/app.js";
import { registerSocketHandlers } from "./src/realtime/socket.js";
import { initEmailTransporter } from "./src/services/email/transporter.js";
import { getLocalIP, getPublicIP } from "./src/utils/network.js";
import { BOOKINGS_FILE } from "./src/config/paths.js";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

// ── Services ──
initEmailTransporter();

// ── Socket.IO ──
registerSocketHandlers(io);

// ── App (middleware, routes, SPA, errori) ──
configureApp(app, io);

// ── Avvio ──
httpServer.listen(config.port, config.host, async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  console.log("✅  Server avviato con Socket.io");
  console.log(`📍  Localhost:    http://localhost:${config.port}`);
  console.log(`🏠  Rete locale:  http://${localIP}:${config.port}`);
  if (publicIP) console.log(`🌐  IP Pubblico:  http://${publicIP}:${config.port}`);
  console.log(`📂  Prenotazioni: ${BOOKINGS_FILE}`);
});

import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/index.js";
import { getLocalIP, getPublicIP } from "./utils/network.js";
import { initEmailTransporter } from "./services/emailService.js";
import { setupSocketHandlers } from "./socket/socketHandler.js";
import { companyRoutes } from "./routes/companyRoutes.js";
import { motorcycleRoutes } from "./routes/motorcycleRoutes.js";
import { bookingRoutes } from "./routes/bookingRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inizializza app
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(config.FRONTEND_DIR));

// Inizializza servizi
initEmailTransporter();

// Socket.IO
setupSocketHandlers(io);

// Routes
companyRoutes(app);
motorcycleRoutes(app);
bookingRoutes(app, io);
healthRoutes(app);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Errore del server", error: err.message });
});

// Avvia server
httpServer.listen(config.PORT, "0.0.0.0", async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  
  console.log("✅ Server avviato con Socket.io");
  console.log(`📍 Localhost:    http://localhost:${config.PORT}`);
  console.log(`🏠 Rete locale:  http://${localIP}:${config.PORT}`);
  if (publicIP) console.log(`🌐 IP Pubblico:  http://${publicIP}:${config.PORT}`);
  console.log(`📂 Prenotazioni: ${config.BOOKINGS_FILE}`);
});
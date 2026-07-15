// Assemblaggio dell'applicazione Express (middleware, static, routes, SPA, errori).
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";

import apiRoutes from "./routes/index.js";
import spaRoutes from "./routes/spaRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configura un'app Express già creata. `io` serve alle route realtime.
export function configureApp(app, io) {
  // ── Middleware ──
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // ── File statici del frontend ──
  app.use(express.static(path.join(__dirname, "../../frontend")));

  // ── Route API (PRIMA del router SPA) ──
  app.use("/api", apiRoutes(io));

  // ── SPA: serve index.html per le route non-API ──
  app.use(spaRoutes);

  // ── Error handler (ULTIMO) ──
  app.use(errorHandler);

  return app;
}

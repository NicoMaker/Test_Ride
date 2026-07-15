// Aggregatore delle route API. Monta company, motorcycles, bookings + health.
import { Router } from "express";
import companyRoutes from "./companyRoutes.js";
import motorcyclesRoutes from "./motorcyclesRoutes.js";
import bookingsRoutes from "./bookingsRoutes.js";

export default function apiRoutes(io) {
  const router = Router();

  router.use(companyRoutes);
  router.use(motorcyclesRoutes);
  router.use(bookingsRoutes(io));

  router.get("/health", (_req, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );

  return router;
}

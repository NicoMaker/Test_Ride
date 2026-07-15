import { Router } from "express";
import { makeBookingsController } from "../controllers/bookingsController.js";

export default function bookingsRoutes(io) {
  const router = Router();
  const ctrl = makeBookingsController(io);

  router.get("/bookings", ctrl.list);
  router.post("/bookings", ctrl.create);
  router.delete("/bookings/:id", ctrl.remove);

  return router;
}

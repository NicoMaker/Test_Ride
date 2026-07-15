import { Router } from "express";
import { getMotorcycles } from "../controllers/motorcyclesController.js";

const router = Router();
router.get("/motorcycles", getMotorcycles);
export default router;

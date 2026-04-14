import { Router } from "express";
import { readJSON } from "../utils/fileStore.js";
import { MOTORCYCLES_FILE } from "../config/paths.js";

const router = Router();

router.get("/motorcycles", (req, res) => {
  const data = readJSON(MOTORCYCLES_FILE);
  if (!data) return res.status(500).json({ error: "Errore caricamento moto" });
  res.json(data);
});

export default router;

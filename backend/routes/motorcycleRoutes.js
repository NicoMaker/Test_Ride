import { readJSON } from "../services/fileService.js";
import { config } from "../config/index.js";

export function motorcycleRoutes(app) {
  app.get("/api/motorcycles", (req, res) => {
    const data = readJSON(config.MOTORCYCLES_FILE);
    if (!data) {
      return res.status(500).json({ error: "Errore caricamento moto" });
    }
    res.json(data);
  });
}
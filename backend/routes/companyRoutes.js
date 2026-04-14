import { readJSON } from "../services/fileService.js";
import { config } from "../config/index.js";

export function companyRoutes(app) {
  app.get("/api/company-info", (req, res) => {
    const data = readJSON(config.COMPANY_FILE);
    if (!data) {
      return res.status(500).json({ error: "Errore caricamento dati azienda" });
    }
    res.json(data);
  });
}
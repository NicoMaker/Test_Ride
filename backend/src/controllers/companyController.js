// Controller azienda: gestisce la richiesta HTTP e delega al service.
import { fetchCompanyInfo } from "../services/companyService.js";

export function getCompanyInfo(req, res) {
  try {
    res.json(fetchCompanyInfo());
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

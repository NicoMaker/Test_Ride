// Controller moto: gestisce la richiesta HTTP e delega al service.
import { fetchMotorcycles } from "../services/motorcyclesService.js";

export function getMotorcycles(req, res) {
  try {
    res.json(fetchMotorcycles());
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

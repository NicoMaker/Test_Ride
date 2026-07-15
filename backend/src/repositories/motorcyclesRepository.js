// Accesso ai dati delle moto (motorcycles.json).
import { readJSON } from "../utils/fileStore.js";
import { MOTORCYCLES_FILE } from "../config/paths.js";

export function getMotorcycles() {
  return readJSON(MOTORCYCLES_FILE);
}

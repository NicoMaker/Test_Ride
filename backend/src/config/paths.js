// Percorsi dei file di dati (JSON) usati come "database" leggero.
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend/src/config → risali di 3 livelli fino alla root del progetto.
export const FRONTEND_DIR = path.join(__dirname, "../../../frontend");
export const DATA_DIR = path.join(FRONTEND_DIR, "data");
export const COMPANY_FILE = path.join(DATA_DIR, "company-info.json");
export const MOTORCYCLES_FILE = path.join(DATA_DIR, "motorcycles.json");
export const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

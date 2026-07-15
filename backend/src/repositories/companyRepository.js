// Accesso ai dati dell'azienda (company-info.json).
import { readJSON } from "../utils/fileStore.js";
import { COMPANY_FILE } from "../config/paths.js";

export function getCompanyInfo() {
  return readJSON(COMPANY_FILE);
}

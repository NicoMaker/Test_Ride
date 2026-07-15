// Logica di business per i dati azienda.
import { getCompanyInfo } from "../repositories/companyRepository.js";

export function fetchCompanyInfo() {
  const data = getCompanyInfo();
  if (!data) throw Object.assign(new Error("Errore caricamento dati azienda"), { status: 500 });
  return data;
}

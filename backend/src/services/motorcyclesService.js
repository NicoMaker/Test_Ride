// Logica di business per le moto.
import { getMotorcycles } from "../repositories/motorcyclesRepository.js";

export function fetchMotorcycles() {
  const data = getMotorcycles();
  if (!data) throw Object.assign(new Error("Errore caricamento moto"), { status: 500 });
  return data;
}

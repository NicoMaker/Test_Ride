// Accesso e persistenza delle prenotazioni (bookings.json).
import { readJSON, writeJSON, ensureFile } from "../utils/fileStore.js";
import { BOOKINGS_FILE } from "../config/paths.js";

function ensureBookingsFile() {
  ensureFile(BOOKINGS_FILE, []);
}

export function getAllBookings() {
  ensureBookingsFile();
  return readJSON(BOOKINGS_FILE) || [];
}

export function saveBookings(bookings) {
  writeJSON(BOOKINGS_FILE, bookings);
}

// Mappa { "data|motoId": [orari...] } usata da frontend e socket.
export function buildBookedSlots(bookings) {
  const map = {};
  bookings.forEach((b) => {
    const key = `${b.date}|${b.motorcycleId}`;
    if (!map[key]) map[key] = [];
    if (!map[key].includes(b.time)) map[key].push(b.time);
  });
  return map;
}

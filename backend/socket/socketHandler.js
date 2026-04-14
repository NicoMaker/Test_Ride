import { readJSON, ensureFile } from "../services/fileService.js";
import { config } from "../config/index.js";

function buildBookedSlots(bookings) {
  const map = {};
  bookings.forEach(b => {
    const key = `${b.date}|${b.motorcycleId}`;
    if (!map[key]) map[key] = [];
    if (!map[key].includes(b.time)) map[key].push(b.time);
  });
  return map;
}

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connesso: ${socket.id}`);
    
    ensureFile(config.BOOKINGS_FILE, []);
    const bookings = readJSON(config.BOOKINGS_FILE) || [];
    socket.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
    
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnesso: ${socket.id}`);
    });
  });
}
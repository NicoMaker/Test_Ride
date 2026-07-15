// Gestione delle connessioni Socket.IO: invio stato slot al connect.
import {
  getAllBookings,
  buildBookedSlots,
} from "../repositories/bookingsRepository.js";

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connesso: ${socket.id}`);

    const bookings = getAllBookings();
    socket.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnesso: ${socket.id}`);
    });
  });
}

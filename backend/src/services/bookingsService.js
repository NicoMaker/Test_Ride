// Logica di business delle prenotazioni: validazione, conflitti, persistenza.
import {
  getAllBookings,
  saveBookings,
  buildBookedSlots,
} from "../repositories/bookingsRepository.js";

export function listBookings() {
  return getAllBookings();
}

export function getBookedSlots() {
  return buildBookedSlots(getAllBookings());
}

// Crea una prenotazione. Lancia errori tipizzati (con .status) in caso di
// dati mancanti (400) o slot già occupato (409).
export function createBooking(booking) {
  if (!booking || !booking.date || !booking.time || !booking.motorcycleId) {
    throw Object.assign(new Error("Dati prenotazione incompleti"), { status: 400 });
  }

  const bookings = getAllBookings();

  const conflict = bookings.find(
    (b) =>
      b.date === booking.date &&
      b.time === booking.time &&
      b.motorcycleId === booking.motorcycleId,
  );
  if (conflict) {
    throw Object.assign(
      new Error("Slot già prenotato per questa moto. Scegli un altro orario."),
      { status: 409 },
    );
  }

  // Salva SOLO i dati di disponibilità (nessun dato personale nel file).
  const slotRecord = {
    id: Date.now().toString(),
    date: booking.date,
    time: booking.time,
    motorcycleId: booking.motorcycleId,
    motorcycleBrand: booking.motorcycleBrand,
    motorcycleModel: booking.motorcycleModel,
    timestamp: new Date().toLocaleString("it-IT"),
  };

  bookings.push(slotRecord);
  saveBookings(bookings);

  return { slotRecord, bookedSlots: buildBookedSlots(bookings) };
}

// Rimuove una prenotazione per id. Lancia 404 se non trovata.
export function deleteBooking(id) {
  let bookings = getAllBookings();
  const before = bookings.length;
  bookings = bookings.filter((b) => b.id !== id);

  if (bookings.length === before) {
    throw Object.assign(new Error("Prenotazione non trovata"), { status: 404 });
  }

  saveBookings(bookings);
  return { bookedSlots: buildBookedSlots(bookings) };
}

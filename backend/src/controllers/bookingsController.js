// Controller prenotazioni: orchestrazione fra service, realtime (socket) ed email.
import {
  listBookings,
  createBooking,
  deleteBooking,
} from "../services/bookingsService.js";
import { sendConfirmationEmails } from "../services/email/emailSender.js";

// I controller che hanno bisogno di `io` (Socket.IO) sono factory: ricevono io
// e ritornano gli handler Express.
export function makeBookingsController(io) {
  return {
    // GET /api/bookings
    list(req, res) {
      res.json(listBookings());
    },

    // POST /api/bookings
    async create(req, res) {
      try {
        const { booking, companyInfo } = req.body;
        const { slotRecord, bookedSlots } = createBooking(booking);

        io.emit("slots_update", { bookedSlots });
        io.emit("new_booking", {
          ...slotRecord,
          nome: booking.nome,
          cognome: booking.cognome,
        });

        if (companyInfo) {
          try {
            await sendConfirmationEmails(booking, companyInfo);
          } catch (e) {
            console.error("⚠️  Email non inviata:", e.message);
          }
        }

        console.log(
          `✅ Prenotazione: ${booking.nome} ${booking.cognome} — ` +
            `${booking.motorcycleBrand} ${booking.motorcycleModel} — ${booking.date} ${booking.time}`,
        );
        res.status(201).json({ success: true, booking });
      } catch (error) {
        res.status(error.status || 500).json({
          success: false,
          message: error.message || "Errore del server",
        });
      }
    },

    // DELETE /api/bookings/:id
    remove(req, res) {
      try {
        const { bookedSlots } = deleteBooking(req.params.id);
        io.emit("slots_update", { bookedSlots });
        res.json({ success: true });
      } catch (error) {
        res.status(error.status || 500).json({
          success: false,
          message: error.message || "Errore del server",
        });
      }
    },
  };
}

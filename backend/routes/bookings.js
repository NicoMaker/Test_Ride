import { Router } from "express";
import {
  ensureBookingsFile,
  readJSON,
  writeJSON,
  buildBookedSlots,
} from "../utils/fileStore.js";
import { BOOKINGS_FILE } from "../config/paths.js";
import { sendConfirmationEmails } from "../services/emailSender.js";

export default function bookingRoutes(io) {
  const router = Router();

  // ── GET /api/bookings ──────────────────────────────────────────────────────
  router.get("/bookings", (req, res) => {
    ensureBookingsFile();
    res.json(readJSON(BOOKINGS_FILE) || []);
  });

  // ── POST /api/bookings ─────────────────────────────────────────────────────
  router.post("/bookings", async (req, res) => {
    try {
      const { booking, companyInfo } = req.body;

      if (!booking || !booking.date || !booking.time || !booking.motorcycleId)
        return res
          .status(400)
          .json({ success: false, message: "Dati prenotazione incompleti" });

      ensureBookingsFile();
      const bookings = readJSON(BOOKINGS_FILE) || [];

      // Controllo disponibilità
      const conflict = bookings.find(
        (b) =>
          b.date === booking.date &&
          b.time === booking.time &&
          b.motorcycleId === booking.motorcycleId,
      );

      if (conflict)
        return res.status(409).json({
          success: false,
          message:
            "Slot già prenotato per questa moto. Scegli un altro orario.",
        });

      // Salva solo dati di disponibilità (no dati personali)
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
      writeJSON(BOOKINGS_FILE, bookings);

      io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
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
      console.error("Errore prenotazione:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Errore del server",
          error: error.message,
        });
    }
  });

  // ── DELETE /api/bookings/:id ───────────────────────────────────────────────
  router.delete("/bookings/:id", (req, res) => {
    try {
      ensureBookingsFile();
      let bookings = readJSON(BOOKINGS_FILE) || [];
      const before = bookings.length;
      bookings = bookings.filter((b) => b.id !== req.params.id);

      if (bookings.length === before)
        return res
          .status(404)
          .json({ success: false, message: "Prenotazione non trovata" });

      writeJSON(BOOKINGS_FILE, bookings);
      io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Errore del server" });
    }
  });

  return router;
}

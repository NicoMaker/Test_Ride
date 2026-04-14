import { readJSON, writeJSON, ensureFile } from "../services/fileService.js";
import { sendConfirmationEmails } from "../services/emailService.js";
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

export function bookingRoutes(app, io) {
  // GET all bookings
  app.get("/api/bookings", (req, res) => {
    ensureFile(config.BOOKINGS_FILE, []);
    res.json(readJSON(config.BOOKINGS_FILE) || []);
  });

  // POST new booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const { booking, companyInfo } = req.body;

      if (!booking || !booking.date || !booking.time || !booking.motorcycleId) {
        return res.status(400).json({ success: false, message: "Dati prenotazione incompleti" });
      }

      ensureFile(config.BOOKINGS_FILE, []);
      const bookings = readJSON(config.BOOKINGS_FILE) || [];

      // Controllo disponibilità
      const conflict = bookings.find(b =>
        b.date === booking.date &&
        b.time === booking.time &&
        b.motorcycleId === booking.motorcycleId
      );

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Slot già prenotato per questa moto. Scegli un altro orario."
        });
      }

      // Salva solo dati disponibilità
      const slotRecord = {
        id: Date.now().toString(),
        date: booking.date,
        time: booking.time,
        motorcycleId: booking.motorcycleId,
        motorcycleBrand: booking.motorcycleBrand,
        motorcycleModel: booking.motorcycleModel,
        timestamp: new Date().toLocaleString("it-IT")
      };

      bookings.push(slotRecord);
      writeJSON(config.BOOKINGS_FILE, bookings);

      // Emetti aggiornamenti Socket.IO
      io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
      io.emit("new_booking", { ...slotRecord, nome: booking.nome, cognome: booking.cognome });

      // Invia email
      if (companyInfo) {
        try {
          await sendConfirmationEmails(booking, companyInfo);
        } catch (e) {
          console.error("⚠️ Email non inviata:", e.message);
        }
      }

      console.log(`✅ Prenotazione: ${booking.nome} ${booking.cognome} — ${booking.motorcycleBrand} ${booking.motorcycleModel} — ${booking.date} ${booking.time}`);
      res.status(201).json({ success: true, booking });

    } catch (error) {
      console.error("Errore prenotazione:", error);
      res.status(500).json({ success: false, message: "Errore del server", error: error.message });
    }
  });

  // DELETE booking
  app.delete("/api/bookings/:id", (req, res) => {
    try {
      ensureFile(config.BOOKINGS_FILE, []);
      let bookings = readJSON(config.BOOKINGS_FILE) || [];
      const before = bookings.length;
      bookings = bookings.filter(b => b.id !== req.params.id);
      
      if (bookings.length === before) {
        return res.status(404).json({ success: false, message: "Prenotazione non trovata" });
      }
      
      writeJSON(config.BOOKINGS_FILE, bookings);
      io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "Errore del server" });
    }
  });
}
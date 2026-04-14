import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import os from "os";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Percorsi ai file dati
const DATA_DIR    = path.join(__dirname, "../frontend/data");
const COMPANY_FILE    = path.join(DATA_DIR, "company-info.json");
const MOTORCYCLES_FILE= path.join(DATA_DIR, "motorcycles.json");
const BOOKINGS_FILE   = path.join(DATA_DIR, "bookings.json");

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ==================== EMAIL ====================
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) console.log("⚠️  Errore configurazione email:", error.message);
  else       console.log("📧 Server email pronto");
});

// ==================== UTILITY ====================
function padTwo(n) { return String(n).padStart(2, "0"); }

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function ensureBookingsFile() {
  if (!fs.existsSync(BOOKINGS_FILE)) {
    writeJSON(BOOKINGS_FILE, []);
  }
}

// Costruisce mappa slot occupati da un array di prenotazioni
function buildBookedSlots(bookings) {
  const map = {};
  bookings.forEach(b => {
    const key = `${b.date}|${b.motorcycleId}`;
    if (!map[key]) map[key] = [];
    if (!map[key].includes(b.time)) map[key].push(b.time);
  });
  return map;
}

// ==================== SOCKET.IO ====================
io.on("connection", (socket) => {
  console.log(`🔌 Client connesso: ${socket.id}`);

  // Invia stato corrente al nuovo client
  ensureBookingsFile();
  const bookings = readJSON(BOOKINGS_FILE) || [];
  socket.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnesso: ${socket.id}`);
  });
});

// ==================== API ROUTES ====================

// Company info
app.get("/api/company-info", (req, res) => {
  const data = readJSON(COMPANY_FILE);
  if (!data) return res.status(500).json({ error: "Errore caricamento dati azienda" });
  res.json(data);
});

// Motorcycles
app.get("/api/motorcycles", (req, res) => {
  const data = readJSON(MOTORCYCLES_FILE);
  if (!data) return res.status(500).json({ error: "Errore caricamento moto" });
  res.json(data);
});

// GET bookings
app.get("/api/bookings", (req, res) => {
  ensureBookingsFile();
  const bookings = readJSON(BOOKINGS_FILE) || [];
  res.json(bookings);
});

// POST booking (nuova prenotazione)
app.post("/api/bookings", async (req, res) => {
  try {
    const { booking, companyInfo } = req.body;

    if (!booking || !booking.date || !booking.time || !booking.motorcycleId) {
      return res.status(400).json({ success: false, message: "Dati prenotazione incompleti" });
    }

    ensureBookingsFile();
    const bookings = readJSON(BOOKINGS_FILE) || [];

    // ── CONTROLLO DISPONIBILITÀ (1 prenotazione per moto per slot) ──
    const conflict = bookings.find(b =>
      b.date === booking.date &&
      b.time === booking.time &&
      b.motorcycleId === booking.motorcycleId
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "Questo slot è già stato prenotato per la moto selezionata. Scegli un altro orario."
      });
    }

    // Salva prenotazione
    booking.id = Date.now().toString();
    booking.timestamp = new Date().toLocaleString("it-IT");
    bookings.push(booking);
    writeJSON(BOOKINGS_FILE, bookings);

    // Notifica tutti i client via Socket.io
    io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
    io.emit("new_booking", booking);

    // Invia email di conferma
    if (companyInfo) {
      try {
        await sendConfirmationEmails(booking, companyInfo);
      } catch (emailErr) {
        console.error("⚠️  Errore invio email:", emailErr.message);
        // Non blocca la risposta: la prenotazione è salvata
      }
    }

    console.log(`✅ Nuova prenotazione: ${booking.nome} ${booking.cognome} — ${booking.motorcycleBrand} ${booking.motorcycleModel} — ${booking.date} ${booking.time}`);
    res.status(201).json({ success: true, booking });

  } catch (error) {
    console.error("Errore prenotazione:", error);
    res.status(500).json({ success: false, message: "Errore del server", error: error.message });
  }
});

// DELETE booking
app.delete("/api/bookings/:id", (req, res) => {
  try {
    ensureBookingsFile();
    let bookings = readJSON(BOOKINGS_FILE) || [];
    const before = bookings.length;
    bookings = bookings.filter(b => b.id !== req.params.id);

    if (bookings.length === before) {
      return res.status(404).json({ success: false, message: "Prenotazione non trovata" });
    }

    writeJSON(BOOKINGS_FILE, bookings);
    io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== EMAIL ====================
async function sendConfirmationEmails(booking, companyInfoData) {
  const c = companyInfoData.company || companyInfoData;
  const managers = companyInfoData.managers || [];

  const [yyyy, mm, dd] = booking.date.split("-");
  const dateFormatted = `${padTwo(dd)}/${padTwo(mm)}/${yyyy}`;
  const formattedDate = new Date(booking.date + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const fullAddress = `${c.address}, ${c.city}${c.cap ? " " + c.cap : ""}`;
  const mapsUrl = c.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const pivaLine = c.piva ? `<br>P. IVA ${c.piva}` : "";

  const commonStyles = `body{margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;}a{color:#b8860b;}`;

  // ── EMAIL CLIENTE ──────────────────────────────────────────────────────────
  const clienteHtml = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Conferma Test Ride</title><style>${commonStyles}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
<tr><td align="center">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#2a2a3e 100%);padding:32px 40px;text-align:center;border-bottom:3px solid #b8860b;">
    <h1 style="font-family:Georgia,serif;font-size:26px;color:#d4af37;margin:0;letter-spacing:1px;">${c.name || "Palmino Motors"}</h1>
    <p style="margin:4px 0 0;font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;">Concessionaria Ufficiale</p>
  </div>
  <div style="padding:36px 40px;background:#fff;">
    <p style="margin:0 0 6px;font-size:16px;color:#2c2c2c;">Gentile <strong style="color:#1a1a2e;">${booking.nome} ${booking.cognome}</strong>,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">la tua prenotazione per il test ride è <strong>confermata</strong>. Ti aspettiamo!</p>

    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Dettagli Prenotazione</div>
    <table style="width:100%;margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;width:38%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Data</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${formattedDate} (${dateFormatted})</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Orario</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${booking.time}</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Moto</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${booking.motorcycleBrand} ${booking.motorcycleModel}${booking.motorcycleCategory ? ` (${booking.motorcycleCategory})` : ""}</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Durata</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">30 minuti</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Patente</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;">${booking.patente}</td></tr>
    </table>

    <div style="background:#fffbf0;border-left:3px solid #b8860b;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#664d00;line-height:1.6;">Presentati <strong>10 minuti prima</strong> con documento d'identità e patente di guida.</p>
    </div>

    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Dove Siamo</div>
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;margin-bottom:24px;">
      <div style="padding:14px 18px;background:#faf7f0;">
        <p style="margin:0 0 4px;font-size:14px;color:#1a1a2e;font-weight:bold;">📍 ${fullAddress}</p>
        <p style="margin:0;font-size:12px;color:#888;"><a href="${mapsUrl}" target="_blank" style="color:#b8860b;text-decoration:none;font-weight:600;">Apri in Google Maps →</a></p>
      </div>
    </div>

    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e8dfc8;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;">Per informazioni o modifiche:</p>
      <p style="margin:0;font-size:13px;color:#2c2c2c;">
        📞 <a href="tel:${(c.phone||"").replace(/\s/g,"")}" style="color:#b8860b;text-decoration:none;font-weight:500;">${c.phone || ""}</a>
        &nbsp;|&nbsp;
        ✉️ <a href="mailto:${c.email||""}" style="color:#b8860b;text-decoration:none;font-weight:500;">${c.email || ""}</a>
      </p>
    </div>
  </div>
  <div style="background:#f5f0e8;padding:18px 40px;text-align:center;border-top:1px solid #e8dfc8;">
    <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 ${c.name || "Palmino Motors"} · Tutti i diritti riservati${pivaLine}</p>
  </div>
</div>
</td></tr>
</table>
</body></html>`;

  // ── EMAIL MANAGER ──────────────────────────────────────────────────────────
  const managerHtml = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nuova Prenotazione</title><style>${commonStyles}</style></head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
<tr><td align="center">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.12);">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#2a2a3e 100%);padding:28px 40px;text-align:center;border-bottom:3px solid #b8860b;">
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#d4af37;margin:0;">${c.name || "Palmino Motors"}</h1>
    <p style="margin:4px 0 0;font-size:10px;color:#a09070;letter-spacing:2px;text-transform:uppercase;">Pannello Gestione Prenotazioni</p>
  </div>
  <div style="background:#b8860b;padding:14px 40px;text-align:center;">
    <span style="font-size:15px;color:#fff;font-weight:bold;">🏍️ Nuova Prenotazione Test Ride</span>
  </div>
  <div style="padding:32px 40px;background:#fff;">

    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Prenotazione</div>
    <table style="width:100%;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Data</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${formattedDate} (${dateFormatted})</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Orario</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${booking.time}</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Moto</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;">${booking.motorcycleBrand} ${booking.motorcycleModel}${booking.motorcycleCategory ? ` (${booking.motorcycleCategory})` : ""}</td></tr>
    </table>

    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Cliente</div>
    <table style="width:100%;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Nome</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${booking.nome} ${booking.cognome}</td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Telefono</td>
          <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
            <a href="tel:${(booking.telefono||"").replace(/\s/g,"")}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${booking.telefono}</a></td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Email</td>
          <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
            <a href="mailto:${booking.email}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${booking.email}</a></td></tr>
      <tr><td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Patente</td>
          <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;">${booking.patente}</td></tr>
    </table>

  </div>
  <div style="background:#f5f0e8;padding:18px 40px;text-align:center;border-top:1px solid #e8dfc8;">
    <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 ${c.name || "Palmino Motors"} · Sistema automatico${pivaLine}</p>
  </div>
</div>
</td></tr>
</table>
</body></html>`;

  // Invia al cliente
  await transporter.sendMail({
    from:    `"${c.name || "Palmino Motors"}" <${process.env.EMAIL_USER}>`,
    to:      booking.email,
    subject: `Conferma Test Ride – ${dateFormatted} ore ${booking.time}`,
    html:    clienteHtml,
  });

  // Invia ai manager
  const managerEmails = managers.map(m => m.email).filter(Boolean).join(", ");
  if (managerEmails) {
    await transporter.sendMail({
      from:    `"${c.name || "Palmino Motors"}" <${process.env.EMAIL_USER}>`,
      to:      managerEmails,
      subject: `🏍️ Nuova prenotazione – ${booking.nome} ${booking.cognome} · ${dateFormatted} ore ${booking.time}`,
      html:    managerHtml,
    });
  }

  console.log(`📧 Email inviate: cliente=${booking.email}, manager=${managerEmails}`);
}

// ==================== START SERVER ====================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}

async function getPublicIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch { return null; }
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Errore del server", error: err.message });
});

httpServer.listen(PORT, "0.0.0.0", async () => {
  const localIP  = getLocalIP();
  const publicIP = await getPublicIP();

  console.log("✅  Server avviato con Socket.io");
  console.log(`📍  Localhost:  http://localhost:${PORT}`);
  console.log(`🏠  Rete locale: http://${localIP}:${PORT}`);
  if (publicIP) console.log(`🌐  IP Pubblico: http://${publicIP}:${PORT}`);
  console.log(`📂  Prenotazioni: ${BOOKINGS_FILE}`);
});
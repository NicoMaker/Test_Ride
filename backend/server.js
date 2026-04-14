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
const DATA_DIR         = path.join(__dirname, "../frontend/data");
const COMPANY_FILE     = path.join(DATA_DIR, "company-info.json");
const MOTORCYCLES_FILE = path.join(DATA_DIR, "motorcycles.json");
const BOOKINGS_FILE    = path.join(DATA_DIR, "bookings.json");

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
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function ensureBookingsFile() {
  if (!fs.existsSync(BOOKINGS_FILE)) writeJSON(BOOKINGS_FILE, []);
}

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
  ensureBookingsFile();
  const bookings = readJSON(BOOKINGS_FILE) || [];
  socket.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
  socket.on("disconnect", () => console.log(`🔌 Client disconnesso: ${socket.id}`));
});

// ==================== API ROUTES ====================

app.get("/api/company-info", (req, res) => {
  const data = readJSON(COMPANY_FILE);
  if (!data) return res.status(500).json({ error: "Errore caricamento dati azienda" });
  res.json(data);
});

app.get("/api/motorcycles", (req, res) => {
  const data = readJSON(MOTORCYCLES_FILE);
  if (!data) return res.status(500).json({ error: "Errore caricamento moto" });
  res.json(data);
});

app.get("/api/bookings", (req, res) => {
  ensureBookingsFile();
  res.json(readJSON(BOOKINGS_FILE) || []);
});

app.post("/api/bookings", async (req, res) => {
  try {
    const { booking, companyInfo } = req.body;

    if (!booking || !booking.date || !booking.time || !booking.motorcycleId)
      return res.status(400).json({ success: false, message: "Dati prenotazione incompleti" });

    ensureBookingsFile();
    const bookings = readJSON(BOOKINGS_FILE) || [];

    // ── CONTROLLO DISPONIBILITÀ ──
    const conflict = bookings.find(b =>
      b.date === booking.date &&
      b.time === booking.time &&
      b.motorcycleId === booking.motorcycleId
    );

    if (conflict)
      return res.status(409).json({
        success: false,
        message: "Slot già prenotato per questa moto. Scegli un altro orario."
      });

    booking.id        = Date.now().toString();
    booking.timestamp = new Date().toLocaleString("it-IT");
    bookings.push(booking);
    writeJSON(BOOKINGS_FILE, bookings);

    io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
    io.emit("new_booking", booking);

    if (companyInfo) {
      try { await sendConfirmationEmails(booking, companyInfo); }
      catch (e) { console.error("⚠️  Email non inviata:", e.message); }
    }

    console.log(`✅ Prenotazione: ${booking.nome} ${booking.cognome} — ${booking.motorcycleBrand} ${booking.motorcycleModel} — ${booking.date} ${booking.time}`);
    res.status(201).json({ success: true, booking });

  } catch (error) {
    console.error("Errore prenotazione:", error);
    res.status(500).json({ success: false, message: "Errore del server", error: error.message });
  }
});

app.delete("/api/bookings/:id", (req, res) => {
  try {
    ensureBookingsFile();
    let bookings = readJSON(BOOKINGS_FILE) || [];
    const before = bookings.length;
    bookings = bookings.filter(b => b.id !== req.params.id);
    if (bookings.length === before)
      return res.status(404).json({ success: false, message: "Prenotazione non trovata" });
    writeJSON(BOOKINGS_FILE, bookings);
    io.emit("slots_update", { bookedSlots: buildBookedSlots(bookings) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ==================== EMAIL BUILDER ====================
// Palette identità Palmino Motors: nero #111 · rosso #e63312 · bianco
// Font: Arial/Helvetica (safe per email) con stile condensed/bold uppercase
async function sendConfirmationEmails(booking, companyInfoData) {
  const c        = companyInfoData.company || companyInfoData;
  const managers = companyInfoData.managers || [];

  const [yyyy, mm, dd] = booking.date.split("-");
  const dateFormatted  = `${padTwo(dd)}/${padTwo(mm)}/${yyyy}`;
  const formattedDate  = new Date(booking.date + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const fullAddress = `${c.address}, ${c.city}${c.cap ? " " + c.cap : ""}`;
  const mapsUrl     = c.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const pivaLine    = c.piva ? `&nbsp;·&nbsp;P. IVA ${c.piva}` : "";
  const companyName = c.name || "Palmino Motors";

  // ── STILI BASE ──────────────────────────────────────────────────────────────
  // Inline CSS per massima compatibilità client email
  const base = `
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif}
    table{border-collapse:collapse}
    img{border:0;outline:none;text-decoration:none}
    a{color:#e63312;text-decoration:none}
  `;

  // ── EMAIL CLIENTE ────────────────────────────────────────────────────────────
  const clienteHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Conferma Test Ride – ${companyName}</title>
  <style>${base}</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
<tr><td align="center">

<!-- WRAPPER -->
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#111111;padding:0;">
      <!-- Striscia rossa top -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:4px;background:linear-gradient(90deg,#e63312,#ff4d2e);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${companyName}</p>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#888888;letter-spacing:3px;text-transform:uppercase;">Concessionaria Ufficiale Moto</p>
          </td>
          <td style="padding:28px 36px 28px 0;text-align:right;vertical-align:middle;">
            <span style="display:inline-block;background:#e63312;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 12px;border-radius:3px;">Test Ride</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── HERO BANNER ── -->
  <tr>
    <td style="background:#e63312;padding:22px 36px;text-align:center;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:900;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">&#10003; Prenotazione Confermata!</p>
      <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(255,255,255,0.85);letter-spacing:.5px;">
        ${formattedDate} &nbsp;·&nbsp; ore ${booking.time}
      </p>
    </td>
  </tr>

  <!-- ── BODY ── -->
  <tr>
    <td style="padding:32px 36px;background:#ffffff;">

      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;">
        Ciao <strong>${booking.nome} ${booking.cognome}</strong>,
      </p>
      <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#555555;line-height:1.65;">
        la tua prenotazione per il test ride è stata <strong style="color:#1a1a1a;">confermata</strong>. Non vediamo l'ora di farti salire in sella!
      </p>

      <!-- Label sezione -->
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Dettagli Prenotazione</p>

      <!-- Tabella dettagli -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Data</td>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Orario</td>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#e63312;font-weight:900;letter-spacing:.5px;border-bottom:1px solid #e8e8e8;">${booking.time}</td>
        </tr>
        <tr>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Moto</td>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">${booking.motorcycleBrand} ${booking.motorcycleModel}${booking.motorcycleCategory ? `<br><span style="font-size:11px;color:#888888;font-weight:400;">${booking.motorcycleCategory}</span>` : ""}</td>
        </tr>
        <tr>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Durata</td>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">30 minuti</td>
        </tr>
        <tr>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;">Patente</td>
          <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;">Cat. ${booking.patente}</td>
        </tr>
      </table>

      <!-- Alert presentarsi prima -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="background:#fff5f3;border-left:4px solid #e63312;border-radius:0 5px 5px 0;padding:13px 16px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;line-height:1.6;">
              &#9888;&nbsp; Presentati <strong>10 minuti prima</strong> dell'orario con <strong>documento d'identità</strong> e <strong>patente di guida</strong>.
            </p>
          </td>
        </tr>
      </table>

      <!-- Dove siamo -->
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Dove Siamo</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;background:#f8f8f8;">
            <p style="margin:0 0 3px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;">&#128205; ${fullAddress}</p>
            <a href="${mapsUrl}" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#e63312;font-weight:700;text-decoration:none;letter-spacing:.5px;text-transform:uppercase;">Apri in Google Maps &rarr;</a>
          </td>
        </tr>
      </table>

      <!-- Contatti -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td style="padding-top:20px;border-top:1px solid #e8e8e8;">
            <p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;">Per informazioni o modifiche:</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">
              &#128222;&nbsp;
              <a href="tel:${(c.phone||"").replace(/\s/g,"")}" style="color:#1a1a1a;text-decoration:none;font-weight:700;">${c.phone || ""}</a>
              &nbsp;&nbsp;&nbsp;
              &#9993;&nbsp;
              <a href="mailto:${c.email||""}" style="color:#e63312;text-decoration:none;font-weight:700;">${c.email || ""}</a>
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ── FOOTER ── -->
  <tr>
    <td style="background:#111111;padding:18px 36px;text-align:center;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#555555;letter-spacing:.5px;">
        &copy; 2026 ${companyName}${pivaLine} &nbsp;·&nbsp; Tutti i diritti riservati
      </p>
    </td>
  </tr>

</table>
<!-- /WRAPPER -->

</td></tr>
</table>

</body>
</html>`;

  // ── EMAIL MANAGER ────────────────────────────────────────────────────────────
  const managerHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Nuova Prenotazione – ${companyName}</title>
  <style>${base}</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
<tr><td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#111111;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:4px;background:linear-gradient(90deg,#e63312,#ff4d2e);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:22px 36px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${companyName}</p>
            <p style="margin:3px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#777777;letter-spacing:3px;text-transform:uppercase;">Pannello Prenotazioni &middot; Admin</p>
          </td>
          <td style="padding:22px 36px 22px 0;text-align:right;vertical-align:middle;">
            <span style="display:inline-block;background:#e63312;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:3px;">&#128691; Nuova</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ── ALERT BANNER ── -->
  <tr>
    <td style="background:#1a1a1a;padding:16px 36px;border-bottom:2px solid #e63312;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">
        &#128205; Nuova prenotazione ricevuta
      </p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaaaaa;">
        ${formattedDate} &nbsp;&middot;&nbsp; ore <strong style="color:#e63312;">${booking.time}</strong>
        &nbsp;&middot;&nbsp; ${booking.motorcycleBrand} ${booking.motorcycleModel}
      </p>
    </td>
  </tr>

  <!-- ── BODY ── -->
  <tr>
    <td style="padding:28px 36px;background:#ffffff;">

      <!-- SEZIONE PRENOTAZIONE -->
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Prenotazione</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Data</td>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">${formattedDate} (${dateFormatted})</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Orario</td>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#e63312;font-weight:900;letter-spacing:1px;border-bottom:1px solid #e8e8e8;">${booking.time}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;">Moto</td>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;">${booking.motorcycleBrand} ${booking.motorcycleModel}${booking.motorcycleCategory ? ` &mdash; <span style="font-weight:400;color:#777777;">${booking.motorcycleCategory}</span>` : ""}</td>
        </tr>
      </table>

      <!-- SEZIONE CLIENTE -->
      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Cliente</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Nome</td>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">${booking.nome} ${booking.cognome}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Telefono</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e8e8e8;">
            <a href="tel:${(booking.telefono||"").replace(/\s/g,"")}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#e63312;font-weight:700;text-decoration:none;">${booking.telefono}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Email</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e8e8e8;">
            <a href="mailto:${booking.email}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#e63312;font-weight:700;text-decoration:none;">${booking.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:.8px;font-weight:700;background:#f8f8f8;">Patente</td>
          <td style="padding:10px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;">Categoria ${booking.patente}</td>
        </tr>
      </table>

      <!-- CTA contatta cliente -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td align="center" style="padding:4px 0;">
            <a href="tel:${(booking.telefono||"").replace(/\s/g,"")}"
               style="display:inline-block;background:#e63312;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:11px 24px;border-radius:4px;margin-right:8px;">
              &#128222; Chiama
            </a>
            <a href="mailto:${booking.email}"
               style="display:inline-block;background:#111111;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:11px 24px;border-radius:4px;">
              &#9993; Scrivi Email
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ── FOOTER ── -->
  <tr>
    <td style="background:#111111;padding:16px 36px;text-align:center;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#555555;letter-spacing:.5px;">
        &copy; 2026 ${companyName}${pivaLine} &nbsp;&middot;&nbsp; Sistema prenotazioni automatico
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;

  // ── INVIO ────────────────────────────────────────────────────────────────────
  await transporter.sendMail({
    from:    `"${companyName}" <${process.env.EMAIL_USER}>`,
    to:      booking.email,
    subject: `✓ Test Ride confermato – ${dateFormatted} ore ${booking.time} | ${companyName}`,
    html:    clienteHtml,
  });

  const managerEmails = managers.map(m => m.email).filter(Boolean).join(", ");
  if (managerEmails) {
    await transporter.sendMail({
      from:    `"${companyName}" <${process.env.EMAIL_USER}>`,
      to:      managerEmails,
      subject: `[Test Ride] ${booking.nome} ${booking.cognome} · ${booking.motorcycleBrand} ${booking.motorcycleModel} · ${dateFormatted} ${booking.time}`,
      html:    managerHtml,
    });
  }

  console.log(`📧 Email inviate → cliente: ${booking.email} | manager: ${managerEmails}`);
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
    const r = await fetch("https://api.ipify.org?format=json");
    return (await r.json()).ip;
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
  console.log(`📍  Localhost:    http://localhost:${PORT}`);
  console.log(`🏠  Rete locale:  http://${localIP}:${PORT}`);
  if (publicIP) console.log(`🌐  IP Pubblico:  http://${publicIP}:${PORT}`);
  console.log(`📂  Prenotazioni: ${BOOKINGS_FILE}`);
});
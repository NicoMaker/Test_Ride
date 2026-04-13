import express from "express";
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
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) console.log("Errore configurazione email:", error);
  else console.log("Server email pronto");
});

// ==================== UTILITY ====================
function padTwo(n) {
  return String(n).padStart(2, "0");
}

// ==================== ROUTES ====================

app.get("/api/company-info", (req, res) => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "../frontend", "data", "company-info.json"),
      "utf8"
    );
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Errore caricamento dati" });
  }
});

app.get("/api/motorcycles", (req, res) => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "../frontend", "data", "motorcycles.json"),
      "utf8"
    );
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Errore caricamento moto" });
  }
});

// ==================== SEND EMAIL ====================

app.post("/api/send-email", async (req, res) => {
  try {
    const {
      to,
      nome,
      cognome,
      email,
      telefono,
      patente,
      motorcycleBrand,
      motorcycleModel,
      motorcycleCategory,
      date,
      time,
      companyInfo,
      managers,
    } = req.body;

    const managerEmails = req.body.cc || "";

    // FIX: data sempre con zero iniziale (es. 09/05/2026)
    const [yyyy, mm, dd] = date.split("-");
    const dateFormatted = `${padTwo(dd)}/${padTwo(mm)}/${yyyy}`;

    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Indirizzo completo con CAP
    const fullAddress = `${companyInfo.address}, ${companyInfo.city}${companyInfo.cap ? " " + companyInfo.cap : ""}`;
    const mapsUrl = companyInfo.mapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    const mapsStaticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(fullAddress)}&zoom=15&size=520x180&markers=color:red%7C${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_MAPS_KEY || ""}`;

    // Sezione mappa: se non c'è API key usiamo un banner testuale con link
    const mapSection = process.env.GOOGLE_MAPS_KEY
      ? `<img src="${mapsStaticUrl}" alt="Mappa" style="width:100%;border-radius:10px;display:block;margin-bottom:0;">`
      : `<a href="${mapsUrl}" target="_blank" style="display:block;background:#e8f5e9;border:1.5px solid #43a047;border-radius:10px;padding:14px 18px;text-decoration:none;color:#1b5e20;font-size:13px;font-weight:600;text-align:center;">
           🗺️ Apri indicazioni su Google Maps<br>
           <span style="font-weight:400;font-size:12px;color:#388e3c;">${fullAddress}</span>
         </a>`;

    // Dati titolare(i) per email manager
    const managersInfo = Array.isArray(managers) ? managers : [];

    // ── STILI COMUNI ──────────────────────────────────────────────────────────
    const commonStyles = `
      body{margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;}
      a{color:#b8860b;}
    `;

    // ── EMAIL AL CLIENTE ──────────────────────────────────────────────────────
    const clienteHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Conferma Test Ride</title>
  <style>${commonStyles}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
<tr><td align="center">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#2a2a3e 100%);padding:32px 40px;text-align:center;border-bottom:3px solid #b8860b;">
    <h1 style="font-family:Georgia,serif;font-size:26px;color:#d4af37;margin:0;letter-spacing:1px;">${companyInfo.name || "Palmino Motors"}</h1>
    <p style="margin:4px 0 0;font-size:11px;color:#a09070;letter-spacing:2px;text-transform:uppercase;">Concessionaria Ufficiale</p>
  </div>

  <!-- BODY -->
  <div style="padding:36px 40px;background:#fff;">
    <p style="margin:0 0 6px;font-size:16px;color:#2c2c2c;">Gentile <strong style="color:#1a1a2e;">${nome} ${cognome}</strong>,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.6;">la tua prenotazione per il test ride è <strong>confermata</strong>. Ti aspettiamo!</p>

    <!-- DETTAGLI PRENOTAZIONE -->
    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Dettagli Prenotazione</div>
    <table style="width:100%;margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;width:38%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Data</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${formattedDate} (${dateFormatted})</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Orario</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${time}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Moto</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${motorcycleBrand} ${motorcycleModel}${motorcycleCategory ? ` (${motorcycleCategory})` : ""}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Durata</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">30 minuti</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Patente</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;"> ${patente}</td>
      </tr>
    </table>

    <!-- NOTA -->
    <div style="background:#fffbf0;border-left:3px solid #b8860b;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#664d00;line-height:1.6;">Presentati <strong>10 minuti prima</strong> con documento d'identità e patente di guida.</p>
    </div>

    <!-- DOVE SIAMO -->
    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Dove Siamo</div>
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;margin-bottom:24px;">
      <div style="padding:14px 18px;background:#faf7f0;">
        <p style="margin:0 0 4px;font-size:14px;color:#1a1a2e;font-weight:bold;">📍 ${fullAddress}</p>
        <p style="margin:0;font-size:12px;color:#888;">
          <a href="${mapsUrl}" target="_blank" style="color:#b8860b;text-decoration:none;font-weight:600;">Apri in Google Maps →</a>
        </p>
      </div>
      <div style="padding:0 14px 14px;background:#faf7f0;">
        ${mapSection}
      </div>
    </div>

    <!-- CONTATTI -->
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #e8dfc8;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;">Per informazioni o modifiche:</p>
      <p style="margin:0;font-size:13px;color:#2c2c2c;">
        📞 <a href="tel:${companyInfo.phone.replace(/\s/g,'')}" style="color:#b8860b;text-decoration:none;font-weight:500;">${companyInfo.phone}</a>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        ✉️ <a href="mailto:${companyInfo.email}" style="color:#b8860b;text-decoration:none;font-weight:500;">${companyInfo.email}</a>
      </p>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#f5f0e8;padding:18px 40px;text-align:center;border-top:1px solid #e8dfc8;">
    <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 ${companyInfo.name || "Palmino Motors"} · Tutti i diritti riservati</p>
  </div>

</div>
</td></tr>
</table>
</body>
</html>`;

    // ── EMAIL AL TITOLARE / MANAGER ───────────────────────────────────────────
    const titolareHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Nuova Prenotazione Test Ride</title>
  <style>${commonStyles}</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
<tr><td align="center">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.12);">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#2a2a3e 100%);padding:28px 40px;text-align:center;border-bottom:3px solid #b8860b;">
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#d4af37;margin:0;letter-spacing:1px;">${companyInfo.name || "Palmino Motors"}</h1>
    <p style="margin:4px 0 0;font-size:10px;color:#a09070;letter-spacing:2px;text-transform:uppercase;">Pannello Gestione Prenotazioni</p>
  </div>

  <!-- ALERT -->
  <div style="background:#b8860b;padding:14px 40px;text-align:center;">
    <span style="font-size:15px;color:#fff;font-weight:bold;letter-spacing:.5px;">🏍️ Nuova Prenotazione Test Ride</span>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;background:#fff;">

    <!-- PRENOTAZIONE -->
    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Prenotazione</div>
    <table style="width:100%;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Data</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${formattedDate} (${dateFormatted})</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Orario</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${time}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Moto</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;">${motorcycleBrand} ${motorcycleModel}${motorcycleCategory ? ` (${motorcycleCategory})` : ""}</td>
      </tr>
    </table>

    <!-- CLIENTE -->
    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Cliente</div>
    <table style="width:100%;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Nome</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${nome} ${cognome}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Telefono</td>
        <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
          <a href="tel:${telefono.replace(/\s/g,'')}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${telefono}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Email</td>
        <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
          <a href="mailto:${email}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Patente</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;"> ${patente}</td>
      </tr>
    </table>

    <!-- SEDE AZIENDALE -->
    <div style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 10px;">Sede</div>
    <table style="width:100%;margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;">
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Indirizzo</td>
        <td style="padding:10px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#fff;border-bottom:1px solid #e8dfc8;">${fullAddress}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Telefono</td>
        <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
          <a href="tel:${companyInfo.phone.replace(/\s/g,'')}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${companyInfo.phone}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Email</td>
        <td style="padding:10px 16px;font-size:14px;background:#fff;border-bottom:1px solid #e8dfc8;">
          <a href="mailto:${companyInfo.email}" style="color:#b8860b;font-weight:bold;text-decoration:none;">${companyInfo.email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#666;background:#faf7f0;">Mappa</td>
        <td style="padding:10px 16px;font-size:14px;background:#fff;">
          <a href="${mapsUrl}" target="_blank" style="color:#b8860b;font-weight:bold;text-decoration:none;">Apri Google Maps →</a>
        </td>
      </tr>
    </table>

    <!-- MAPPA -->
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e8dfc8;margin-bottom:28px;">
      ${mapSection}
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#f5f0e8;padding:18px 40px;text-align:center;border-top:1px solid #e8dfc8;">
    <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 ${companyInfo.name || "Palmino Motors"} · Sistema di prenotazione automatico</p>
  </div>

</div>
</td></tr>
</table>
</body>
</html>`;

    // Invia email al cliente
    await transporter.sendMail({
      from: `"${companyInfo.name || "Palmino Motors"}" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Conferma Test Ride – ${dateFormatted} ore ${time}`,
      html: clienteHtml,
    });

    // Invia email al titolare/manager
    await transporter.sendMail({
      from: `"${companyInfo.name || "Palmino Motors"}" <${process.env.EMAIL_USER}>`,
      to: managerEmails,
      subject: `🏍️ Nuova prenotazione – ${nome} ${cognome} · ${dateFormatted} ore ${time}`,
      html: titolareHtml,
    });

    console.log(`Email inviate per prenotazione di ${nome} ${cognome} — ${dateFormatted} ${time}`);
    res.status(200).json({ success: true, message: "Email inviate con successo" });

  } catch (error) {
    console.error("Errore invio email:", error);
    res.status(500).json({
      success: false,
      message: "Errore invio email",
      error: error.message,
    });
  }
});

// ==================== UTILS ====================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

async function getPublicIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return null;
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server attivo e funzionante" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Errore del server", error: err.message });
});

app.listen(PORT, "0.0.0.0", async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  const publicBaseUrl = publicIP ? `http://${publicIP}:${PORT}` : `http://localhost:${PORT}`;

  console.log("✅ Backend avviato");
  console.log(`🌐 IP Pubblico: ${publicIP ? publicBaseUrl : "non disponibile"}`);
  console.log(`🏠 IP Locale: http://${localIP}:${PORT}`);
  console.log(`📍 Localhost: http://localhost:${PORT}`);
  console.log(`📧 Server email pronto`);
});
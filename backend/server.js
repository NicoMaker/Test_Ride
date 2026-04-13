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

// ==================== ROUTES ====================

app.get("/api/company-info", (req, res) => {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "../frontend", "data", "company-info.json"),
      "utf8",
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
      "utf8",
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
    } = req.body;

    const managerEmails = req.body.cc || "";

    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
      "it-IT",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    // ── EMAIL AL CLIENTE ──────────────────────────────────────────────────────
    const clienteHtml = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conferma Test Ride</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f0e8;
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #2a2a3e 100%);
          padding: 32px 40px;
          text-align: center;
          border-bottom: 3px solid #b8860b;
        }
        .header h1 {
          font-family: 'Georgia', serif;
          font-size: 28px;
          color: #d4af37;
          margin: 0;
          letter-spacing: 1px;
        }
        .content {
          padding: 36px 40px;
          background: #ffffff;
        }
        .greeting {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #2c2c2c;
        }
        .greeting strong {
          color: #1a1a2e;
        }
        .message {
          margin: 0 0 28px 0;
          font-size: 14px;
          color: #555555;
          line-height: 1.6;
        }
        .details-box {
          background: #faf7f0;
          border-radius: 12px;
          border: 1px solid #e8dfc8;
          margin-bottom: 24px;
          overflow: hidden;
        }
        .details-title {
          font-size: 11px;
          color: #b8860b;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: bold;
          padding: 20px 24px 8px 24px;
        }
        .details-table {
          width: 100%;
          padding: 0 24px 20px 24px;
        }
        .details-table td {
          padding: 8px 0;
          font-size: 14px;
        }
        .details-label {
          color: #666666;
          width: 40%;
        }
        .details-value {
          color: #1a1a2e;
          font-weight: bold;
        }
        .note-box {
          background: #fffbf0;
          border-left: 3px solid #b8860b;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 28px;
        }
        .note-box p {
          margin: 0;
          font-size: 13px;
          color: #664d00;
          line-height: 1.6;
        }
        .contacts {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e8dfc8;
        }
        .contacts p {
          margin: 0 0 6px 0;
          font-size: 13px;
          color: #888888;
        }
        .contacts a {
          color: #b8860b;
          text-decoration: none;
          font-weight: 500;
        }
        .contacts a:hover {
          text-decoration: underline;
        }
        .footer {
          background: #f5f0e8;
          padding: 20px 40px;
          text-align: center;
          border-top: 1px solid #e8dfc8;
        }
        .footer p {
          margin: 0;
          font-size: 11px;
          color: #8a7a6a;
        }
        @media (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 24px 20px; }
          .footer { padding: 16px 20px; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
        <tr><td align="center">
          <div class="container" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            
            <!-- HEADER -->
            <div class="header" style="background:linear-gradient(135deg, #1a1a2e 0%, #2a2a3e 100%);padding:32px 40px;text-align:center;border-bottom:3px solid #b8860b;">
              <h1 style="font-family:Georgia,serif;font-size:28px;color:#d4af37;margin:0;letter-spacing:1px;">Palmino Motors</h1>
            </div>
            
            <!-- BODY -->
            <div class="content" style="padding:36px 40px;background:#ffffff;">
              <p class="greeting" style="margin:0 0 8px 0;font-size:16px;color:#2c2c2c;">Gentile <strong style="color:#1a1a2e;">${nome} ${cognome}</strong>,</p>
              <p class="message" style="margin:0 0 28px 0;font-size:14px;color:#555555;line-height:1.6;">la tua prenotazione per il test ride è confermata. Ti aspettiamo!</p>
              
              <!-- RIEPILOGO -->
              <div class="details-box" style="background:#faf7f0;border-radius:12px;border:1px solid #e8dfc8;margin-bottom:24px;overflow:hidden;">
                <div class="details-title" style="font-size:11px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;padding:20px 24px 8px 24px;">Dettagli Prenotazione</div>
                <table class="details-table" style="width:100%;padding:0 24px 20px 24px;">
                  <tr>
                    <td class="details-label" style="padding:8px 0;font-size:14px;color:#666666;width:40%;">Data</td>
                    <td class="details-value" style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="details-label" style="padding:8px 0;font-size:14px;color:#666666;">Orario</td>
                    <td class="details-value" style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">${time}</td>
                  </tr>
                  <tr>
                    <td class="details-label" style="padding:8px 0;font-size:14px;color:#666666;">Moto</td>
                    <td class="details-value" style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">${motorcycleBrand} ${motorcycleModel}${motorcycleCategory ? ` (${motorcycleCategory})` : ""}</td>
                  </tr>
                  <tr>
                    <td class="details-label" style="padding:8px 0;font-size:14px;color:#666666;">Durata</td>
                    <td class="details-value" style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">30 minuti</td>
                  </tr>
                  <tr>
                    <td class="details-label" style="padding:8px 0;font-size:14px;color:#666666;">Patente</td>
                    <td class="details-value" style="padding:8px 0;font-size:14px;color:#1a1a2e;font-weight:bold;">Categoria ${patente}</td>
                  </tr>
                </table>
              </div>
              
              <!-- NOTA -->
              <div class="note-box" style="background:#fffbf0;border-left:3px solid #b8860b;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#664d00;line-height:1.6;">Presentati <strong>10 minuti prima</strong> con documento d'identità e patente di guida.</p>
              </div>
              
              <!-- CONTATTI -->
              <div class="contacts" style="margin-top:20px;padding-top:20px;border-top:1px solid #e8dfc8;">
                <p style="margin:0 0 6px 0;font-size:13px;color:#888888;">Per informazioni o modifiche:</p>
                <p style="margin:0;font-size:13px;color:#2c2c2c;">
                  📞 <a href="tel:${companyInfo.phone.replace(/\s/g, "")}" style="color:#b8860b;text-decoration:none;font-weight:500;">${companyInfo.phone}</a>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  ✉️ <a href="mailto:${companyInfo.email}" style="color:#b8860b;text-decoration:none;font-weight:500;">${companyInfo.email}</a>
                </p>
              </div>
            </div>
            
            <!-- FOOTER -->
            <div class="footer" style="background:#f5f0e8;padding:20px 40px;text-align:center;border-top:1px solid #e8dfc8;">
              <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 Palmino Motors - Tutti i diritti riservati</p>
            </div>
            
          </div>
        </td></tr>
      </table>
    </body>
    </html>`;

    // ── EMAIL AL TITOLARE ─────────────────────────────────────────────────────
    const titolareHtml = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuova Prenotazione Test Ride</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f0e8;
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #2a2a3e 100%);
          padding: 28px 40px;
          text-align: center;
          border-bottom: 3px solid #b8860b;
        }
        .header h1 {
          font-family: 'Georgia', serif;
          font-size: 24px;
          color: #d4af37;
          margin: 0;
          letter-spacing: 1px;
        }
        .alert-banner {
          background: #b8860b;
          padding: 14px 40px;
          text-align: center;
        }
        .alert-banner span {
          font-size: 15px;
          color: #ffffff;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 32px 40px;
          background: #ffffff;
        }
        .section-title {
          font-size: 13px;
          color: #b8860b;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: bold;
          margin: 0 0 12px 0;
          text-align: left;
          padding-left: 0;
        }
        .info-table {
          width: 100%;
          margin-bottom: 32px;
          background: #faf7f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .info-table td {
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid #e8dfc8;
        }
        .info-table tr:last-child td {
          border-bottom: none;
        }
        .info-label {
          color: #666666;
          width: 35%;
          background: #faf7f0;
        }
        .info-value {
          color: #1a1a2e;
          font-weight: bold;
          background: #ffffff;
        }
        .info-value a {
          color: #b8860b;
          text-decoration: none;
        }
        .info-value a:hover {
          text-decoration: underline;
        }
        .footer {
          background: #f5f0e8;
          padding: 18px 40px;
          text-align: center;
          border-top: 1px solid #e8dfc8;
        }
        .footer p {
          margin: 0;
          font-size: 11px;
          color: #8a7a6a;
        }
        @media (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 20px 20px; }
          .alert-banner { padding: 12px 20px; }
          .footer { padding: 14px 20px; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
        <tr><td align="center">
          <div class="container" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
            
            <!-- HEADER -->
            <div class="header" style="background:linear-gradient(135deg, #1a1a2e 0%, #2a2a3e 100%);padding:28px 40px;text-align:center;border-bottom:3px solid #b8860b;">
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#d4af37;margin:0;letter-spacing:1px;">Palmino Motors</h1>
            </div>
            
            <!-- ALERT BANNER -->
            <div class="alert-banner" style="background:#b8860b;padding:14px 40px;text-align:center;">
              <span style="font-size:15px;color:#ffffff;font-weight:bold;letter-spacing:0.5px;">🏍️ Nuova Prenotazione Test Ride</span>
            </div>
            
            <!-- BODY -->
            <div class="content" style="padding:32px 40px;background:#ffffff;">
              
              <!-- TITOLO PRENOTAZIONE (allineato a sinistra, NON centrato) -->
              <div class="section-title" style="font-size:13px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 12px 0;text-align:left;">Prenotazione</div>
              <table class="info-table" style="width:100%;margin-bottom:32px;background:#faf7f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Data</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;border-bottom:1px solid #e8dfc8;">${formattedDate}</td>
                </tr>
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Orario</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;border-bottom:1px solid #e8dfc8;">${time}</td>
                </tr>
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;background:#faf7f0;">Moto</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;">${motorcycleBrand} ${motorcycleModel}${motorcycleCategory ? ` (${motorcycleCategory})` : ""}</td>
                </tr>
              </table>
              
              <!-- TITOLO CLIENTE (allineato a sinistra, NON centrato) -->
              <div class="section-title" style="font-size:13px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin:0 0 12px 0;text-align:left;">Cliente</div>
              <table class="info-table" style="width:100%;margin-bottom:28px;background:#faf7f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;width:35%;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Nome</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;border-bottom:1px solid #e8dfc8;">${nome} ${cognome}</td>
                </tr>
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Telefono</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;border-bottom:1px solid #e8dfc8;"><a href="tel:${telefono.replace(/\s/g, "")}" style="color:#b8860b;text-decoration:none;">${telefono}</a></td>
                </tr>
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;background:#faf7f0;border-bottom:1px solid #e8dfc8;">Email</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;border-bottom:1px solid #e8dfc8;"><a href="mailto:${email}" style="color:#b8860b;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td class="info-label" style="padding:12px 16px;font-size:14px;color:#666666;background:#faf7f0;">Patente</td>
                  <td class="info-value" style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;background:#ffffff;">Categoria ${patente}</td>
                </tr>
              </table>
              
            </div>
            
            <!-- FOOTER -->
            <div class="footer" style="background:#f5f0e8;padding:18px 40px;text-align:center;border-top:1px solid #e8dfc8;">
              <p style="margin:0;font-size:11px;color:#8a7a6a;">© 2026 Palmino Motors - Sistema di prenotazione automatico</p>
            </div>
            
          </div>
        </table></tr>
      </table>
    </body>
    </html>`;

    // Invia email al cliente
    await transporter.sendMail({
      from: `"Palmino Motors" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Conferma Test Ride – ${formattedDate} ore ${time}`,
      html: clienteHtml,
    });

    // Invia email al titolare
    await transporter.sendMail({
      from: `"Palmino Motors" <${process.env.EMAIL_USER}>`,
      to: managerEmails,
      subject: `🏍️ Nuova prenotazione – ${nome} ${cognome} · ${formattedDate} ore ${time}`,
      html: titolareHtml,
    });

    console.log(`Email inviate per prenotazione di ${nome} ${cognome}`);
    res
      .status(200)
      .json({ success: true, message: "Email inviate con successo" });
  } catch (error) {
    console.error("Errore invio email:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Errore invio email",
        error: error.message,
      });
  }
});

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
  res
    .status(500)
    .json({ success: false, message: "Errore del server", error: err.message });
});

app.listen(PORT, "0.0.0.0", async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  const publicBaseUrl = publicIP
    ? `http://${publicIP}:${PORT}`
    : `http://localhost:${PORT}`;

  console.log("✅ Backend avviato");
  console.log(
    `🌐 IP Pubblico: ${publicIP ? publicBaseUrl : "non disponibile"}`,
  );
  console.log(`🏠 IP Locale: http://${localIP}:${PORT}`);
  console.log(`📍 Localhost: http://localhost:${PORT}`);
  console.log(`📧 Server email pronto`);
});

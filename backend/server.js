import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import os from 'os';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) console.log('Errore configurazione email:', error);
  else console.log('Server email pronto');
});

// ==================== ROUTES ====================

app.get('/api/company-info', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../frontend', 'data', 'company-info.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento dati' });
  }
});

app.get('/api/motorcycles', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../frontend', 'data', 'motorcycles.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento moto' });
  }
});

app.get('/api/motorcycle-categories', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../frontend', 'data', 'motorcycle-categories.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Errore caricamento categorie' });
  }
});

// ==================== SEND EMAIL ====================

app.post('/api/send-email', async (req, res) => {
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
      date,
      time,
      companyInfo
    } = req.body;

    const managerEmails = req.body.cc || '';

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // ── EMAIL AL CLIENTE ──────────────────────────────────────────────────────
    const clienteHtml = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="background:#1a1a2e;padding:32px 40px;text-align:center;border-bottom:3px solid #b8860b;">
          <div style="font-family:Georgia,serif;font-size:26px;color:#d4af37;font-weight:bold;letter-spacing:1px;">Palmino Motors</div>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:36px 40px;">

          <p style="margin:0 0 8px;font-size:15px;color:#2c2c2c;">Gentile <strong>${nome} ${cognome}</strong>,</p>
          <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
            la tua prenotazione per il test ride è confermata. Ti aspettiamo!
          </p>

          <!-- RIEPILOGO -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;border-radius:8px;border:1px solid #e8dfc8;margin-bottom:24px;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #e8dfc8;">
                <div style="font-size:10px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;font-weight:bold;">Dettagli Prenotazione</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#555;padding:6px 0;width:40%;">Data</td>
                    <td style="font-size:13px;color:#2c2c2c;font-weight:bold;padding:6px 0;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#555;padding:6px 0;">Orario</td>
                    <td style="font-size:13px;color:#2c2c2c;font-weight:bold;padding:6px 0;">${time}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#555;padding:6px 0;">Moto</td>
                    <td style="font-size:13px;color:#2c2c2c;font-weight:bold;padding:6px 0;">${motorcycleBrand} ${motorcycleModel}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#555;padding:6px 0;">Durata</td>
                    <td style="font-size:13px;color:#2c2c2c;font-weight:bold;padding:6px 0;">30 minuti</td>
                  </tr>

                  <tr>
                    <td style="font-size:13px;color:#555;padding:6px 0;">Patente</td>
                    <td style="font-size:13px;color:#2c2c2c;font-weight:bold;padding:6px 0;">Categoria ${patente}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- NOTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border-left:3px solid #b8860b;border-radius:4px;margin-bottom:28px;">
            <tr>
              <td style="padding:14px 18px;font-size:13px;color:#664d00;line-height:1.6;">
                Presentati <strong>10 minuti prima</strong> con documento d'identità e patente di guida.
              </td>
            </tr>
          </table>

          <!-- CONTATTI -->
          <p style="margin:0 0 6px;font-size:13px;color:#888;">Per informazioni o modifiche:</p>
          <p style="margin:0;font-size:13px;color:#2c2c2c;">
            📞 <a href="tel:${companyInfo.phone.replace(/\s/g,'')}" style="color:#b8860b;text-decoration:none;">${companyInfo.phone}</a>
            &nbsp;&nbsp;
            ✉️ <a href="mailto:${companyInfo.email}" style="color:#b8860b;text-decoration:none;">${companyInfo.email}</a>
          </p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f4f1eb;padding:20px 40px;text-align:center;border-top:1px solid #e8dfc8;">
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    // ── EMAIL AL TITOLARE ─────────────────────────────────────────────────────
    const titolareHtml = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#1a1a2e;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.3);">

      <!-- HEADER -->
      <tr>
        <td style="background:#1a1a2e;padding:28px 40px;border-bottom:3px solid #b8860b;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#d4af37;font-weight:bold;">Palmino Motors</div>
      </tr>

      <!-- ALERT BANNER -->
      <tr>
        <td style="background:#b8860b;padding:16px 40px;">
          <div style="font-size:16px;color:#fff;font-weight:bold;letter-spacing:0.5px;">
            🏍️ &nbsp;Nuova Prenotazione Test Ride
          </div>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:32px 40px;">

          <!-- PRENOTAZIONE -->
          <div style="font-size:10px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:12px;">Prenotazione</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr style="background:#faf7f0;">
              <td style="padding:12px 16px;font-size:13px;color:#555;width:35%;border-bottom:1px solid #e8dfc8;">Data</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;border-bottom:1px solid #e8dfc8;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#555;border-bottom:1px solid #e8dfc8;">Orario</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;border-bottom:1px solid #e8dfc8;">${time}</td>
            </tr>
            <tr style="background:#faf7f0;">
              <td style="padding:12px 16px;font-size:13px;color:#555;border-bottom:1px solid #e8dfc8;">Moto</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;border-bottom:1px solid #e8dfc8;">${motorcycleBrand} ${motorcycleModel}</td>
            </tr>
          </table>

          <!-- CLIENTE -->
          <div style="font-size:10px;color:#b8860b;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:12px;">Cliente</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr style="background:#faf7f0;">
              <td style="padding:12px 16px;font-size:13px;color:#555;width:35%;border-bottom:1px solid #e8dfc8;">Nome</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;border-bottom:1px solid #e8dfc8;">${nome} ${cognome}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#555;border-bottom:1px solid #e8dfc8;">Telefono</td>
              <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #e8dfc8;">
                <a href="tel:${telefono.replace(/\s/g,'')}" style="color:#b8860b;text-decoration:none;font-weight:bold;">${telefono}</a>
              </td>
            </tr>
            <tr style="background:#faf7f0;">
              <td style="padding:12px 16px;font-size:13px;color:#555;border-bottom:1px solid #e8dfc8;">Email</td>
              <td style="padding:12px 16px;font-size:14px;border-bottom:1px solid #e8dfc8;">
                <a href="mailto:${email}" style="color:#b8860b;text-decoration:none;font-weight:bold;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#555;">Patente</td>
              <td style="padding:12px 16px;font-size:14px;color:#1a1a2e;font-weight:bold;">Categoria ${patente}</td>
            </tr>
          </table>

          <!-- AZIONE RAPIDA -->
          <table width="100%" cellpadding="0" cellspacing="0">
          </table>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#1a1a2e;padding:18px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#5a5a7a;">© 2026 Palmino Motors – Sistema di prenotazione automatico</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    // Invia email al cliente
    await transporter.sendMail({
      from: `"Palmino Motors" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Conferma Test Ride – ${formattedDate} ore ${time}`,
      html: clienteHtml
    });

    // Invia email al titolare
    await transporter.sendMail({
      from: `"Palmino Motors" <${process.env.EMAIL_USER}>`,
      to: managerEmails,
      subject: `🏍️ Nuova prenotazione – ${nome} ${cognome} · ${formattedDate} ore ${time}`,
      html: titolareHtml
    });

    console.log(`Email inviate per prenotazione di ${nome} ${cognome}`);
    res.status(200).json({ success: true, message: 'Email inviate con successo' });

  } catch (error) {
    console.error('Errore invio email:', error);
    res.status(500).json({ success: false, message: 'Errore invio email', error: error.message });
  }
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function getPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return null;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server attivo e funzionante' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Errore del server', error: err.message });
});

// --- Nuovo blocco app.listen ---
app.listen(PORT, "0.0.0.0", async () => {
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  const publicBaseUrl = publicIP
    ? `http://${publicIP}:${PORT}`
    : `http://localhost:${PORT}`;

  console.log("✅ Backend avviato");
  console.log(`🌐 IP Pubblico: ${publicIP ? publicBaseUrl : "non disponibile"}`);
  console.log(`🏠 IP Locale: http://${localIP}:${PORT}`);
  console.log(`📍 Localhost: http://localhost:${PORT}`);
  console.log(`📧 Server email pronto}`);
});
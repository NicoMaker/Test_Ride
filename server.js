import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';

// Configurazione ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configurazione Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verifica configurazione email
transporter.verify(function (error, success) {
  if (error) {
    console.log('Errore configurazione email:', error);
  } else {
    console.log('Server email pronto');
  }
});

// ==================== ROUTES ==================== 

// API per invio email test ride
app.post('/api/send-email', async (req, res) => {
  try {
    const {
      to,
      cc,
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

    // Formatta data
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // HTML contenuto email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
        
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #e74c3c;">
          <h1 style="color: #e74c3c; margin: 0; font-size: 2rem;">Moto Rossi</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 0.9rem;">Concessionaria Ufficiale</p>
        </div>

        <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Conferma Prenotazione Test Ride</h2>
        
        <p style="color: #2c3e50; font-size: 1rem;">Gentile <strong>${nome} ${cognome}</strong>,</p>
        
        <p style="color: #2c3e50; font-size: 1rem;">grazie per aver prenotato un test ride presso la nostra concessionaria! Di seguito troverai i dettagli della tua prenotazione:</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
          
          <h3 style="color: #e74c3c; margin-top: 0; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px;">Dati Prenotazione</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Data:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Orario:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${time}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Durata:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">30 minuti</td>
            </tr>
          </table>

          <h3 style="color: #e74c3c; margin-top: 20px; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px;">Moto Selezionata</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Marca:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${motorcycleBrand}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Modello:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${motorcycleModel}</td>
            </tr>
          </table>

          <h3 style="color: #e74c3c; margin-top: 20px; border-bottom: 1px solid #ecf0f1; padding-bottom: 10px;">Tuoi Dati</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Nome:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${nome}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Cognome:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${cognome}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Email:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #ecf0f1;">Telefono:</td>
              <td style="padding: 10px 0; color: #7f8c8d; border-bottom: 1px solid #ecf0f1;">${telefono}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #2c3e50;">Patente:</td>
              <td style="padding: 10px 0; color: #7f8c8d;">Categoria ${patente}</td>
            </tr>
          </table>

        </div>

        <div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Importante</p>
          <p style="color: #856404; margin: 5px 0 0 0; font-size: 0.95rem;">
            Ti preghiamo di presentarti 10 minuti prima dell'orario prenotato. 
            Porta con te un documento di identità valido e la patente di guida.
          </p>
        </div>

        <div style="background: #d4edda; border-left: 4px solid #27ae60; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-weight: bold;">✓ Condizioni del Test Ride</p>
          <ul style="color: #155724; margin: 10px 0 0 20px; font-size: 0.95rem;">
            <li>Durata: 30 minuti gratuiti</li>
            <li>Percorso: Guidato da un nostro esperto</li>
            <li>Assicurazione: Coperta dalla nostra polizza</li>
            <li>Casco e abbigliamento: Fornito dalla concessionaria</li>
          </ul>
        </div>

        <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Informazioni Concessionaria</h3>
          <p style="color: #7f8c8d; margin: 10px 0;">
            <strong>${companyInfo.name}</strong><br/>
            ${companyInfo.address}<br/>
            ${companyInfo.cap} ${companyInfo.city} (${companyInfo.province})<br/>
            <strong>Telefono:</strong> ${companyInfo.phone}<br/>
            <strong>Email:</strong> ${companyInfo.email}
          </p>
        </div>

        <p style="color: #2c3e50; font-size: 0.95rem;">
          Se hai domande o necessiti di modificare la prenotazione, non esitare a contattarci:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="tel:${companyInfo.phone.replace(/\s/g, '')}" style="background: #e74c3c; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-right: 10px;">Chiama</a>
          <a href="mailto:${companyInfo.email}" style="background: #2c3e50; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Email</a>
        </div>

        <hr style="border: none; border-top: 2px solid #ecf0f1; margin: 30px 0;">

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ecf0f1;">
          <p style="color: #7f8c8d; font-size: 0.85rem; margin: 0;">
            &copy; 2025 Moto Rossi - Concessionaria Ufficiale. Tutti i diritti riservati.<br/>
            Questo è un messaggio automatico, si prega di non rispondere.
          </p>
        </div>

      </div>
    `;

    // Configura email
    const mailOptions = {
      from: `"Moto Rossi" <${process.env.EMAIL_USER}>`,
      to: to,
      cc: cc || '',
      subject: 'Conferma Prenotazione Test Ride - Moto Rossi',
      html: htmlContent
    };

    // Invia email
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`Email inviata a ${to} (ID: ${result.messageId})`);

    res.status(200).json({ 
      success: true, 
      message: 'Email inviata con successo',
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore nell\'invio dell\'email', 
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server attivo e funzionante' });
});

// ==================== ERROR HANDLING ==================== 
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    success: false, 
    message: 'Errore del server',
    error: err.message 
  });
});

// ==================== START SERVER ==================== 
app.listen(PORT, () => {
  console.log(`🏍️  Server Moto Rossi in esecuzione su http://localhost:${PORT}`);
  console.log(`📧 Email configurato per: ${process.env.EMAIL_USER}`);
});
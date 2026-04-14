import nodemailer from "nodemailer";
import { config } from "../config/index.js";
import { clientEmailTemplate } from "../emailTemplates/clientEmail.js";
import { managerEmailTemplate } from "../emailTemplates/managerEmail.js";
import { formatDateForDisplay, formatDateLong } from "../utils/helpers.js";

let transporter = null;

export function initEmailTransporter() {
  transporter = nodemailer.createTransport({
    host: config.EMAIL.host,
    port: config.EMAIL.port,
    secure: config.EMAIL.secure,
    auth: {
      user: config.EMAIL.user,
      pass: config.EMAIL.password,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.log("⚠️ Errore configurazione email:", error.message);
    } else {
      console.log("📧 Server email pronto");
    }
  });
}

export async function sendConfirmationEmails(booking, companyInfoData) {
  if (!transporter) {
    console.error("❌ Email transporter non inizializzato");
    return;
  }

  const company = companyInfoData.company || companyInfoData;
  const managers = companyInfoData.managers || [];
  const companyName = company.name || "Palmino Motors";
  
  const dateFormatted = formatDateForDisplay(booking.date);
  const formattedDate = formatDateLong(booking.date);
  
  const fullAddress = `${company.address}, ${company.city}${company.cap ? " " + company.cap : ""}`;
  const mapsUrl = company.mapsUrl || 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const pivaLine = company.piva ? `&nbsp;·&nbsp;P. IVA ${company.piva}` : "";

  // Email cliente
  const clientHtml = clientEmailTemplate({
    companyName,
    booking,
    formattedDate,
    fullAddress,
    mapsUrl,
    pivaLine,
    phone: company.phone,
    email: company.email
  });

  await transporter.sendMail({
    from: `"${companyName}" <${config.EMAIL.user}>`,
    to: booking.email,
    subject: `✓ Test Ride confermato – ${dateFormatted} ore ${booking.time} | ${companyName}`,
    html: clientHtml,
  });

  // Email manager
  const managerEmails = managers.map(m => m.email).filter(Boolean).join(", ");
  if (managerEmails) {
    const managerHtml = managerEmailTemplate({
      companyName,
      booking,
      formattedDate,
      dateFormatted,
      pivaLine
    });

    await transporter.sendMail({
      from: `"${companyName}" <${config.EMAIL.user}>`,
      to: managerEmails,
      subject: `[Test Ride] ${booking.nome} ${booking.cognome} · ${booking.motorcycleBrand} ${booking.motorcycleModel} · ${dateFormatted} ${booking.time}`,
      html: managerHtml,
    });
  }

  console.log(`📧 Email inviate → cliente: ${booking.email} | manager: ${managerEmails}`);
}
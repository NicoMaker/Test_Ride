// Inizializzazione e accesso al transporter Nodemailer.
import nodemailer from "nodemailer";
import { config } from "../../config/env.js";

let transporter;

export function initEmailTransporter() {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  transporter.verify((error) => {
    if (error) console.log("⚠️  Errore configurazione email:", error.message);
    else console.log("📧 Server email pronto");
  });
}

export function getTransporter() {
  if (!transporter) throw new Error("Transporter email non inizializzato.");
  return transporter;
}

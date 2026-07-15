// Caricamento variabili d'ambiente e configurazione centralizzata del server.
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3002", 10),
  host: process.env.HOST || "0.0.0.0",
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
};

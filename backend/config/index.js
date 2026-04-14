import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  PORT: process.env.PORT || 3000,
  
  // Percorsi
  ROOT_DIR: path.join(__dirname, ".."),
  FRONTEND_DIR: path.join(__dirname, "../../frontend"),
  DATA_DIR: path.join(__dirname, "../../frontend/data"),
  
  // File JSON
  COMPANY_FILE: path.join(__dirname, "../../frontend/data/company-info.json"),
  MOTORCYCLES_FILE: path.join(__dirname, "../../frontend/data/motorcycles.json"),
  BOOKINGS_FILE: path.join(__dirname, "../../frontend/data/bookings.json"),
  
  // Email
  EMAIL: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  }
};
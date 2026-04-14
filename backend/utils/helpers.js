/**
 * Aggiunge uno zero davanti ai numeri da 0 a 9
 * @param {number} n - Numero da formattare
 * @returns {string} Numero con almeno 2 cifre
 */
export function padTwo(n) {
  return String(n).padStart(2, "0");
}

/**
 * Formatta una data YYYY-MM-DD in DD/MM/YYYY
 * @param {string} dateString - Data in formato YYYY-MM-DD
 * @returns {string} Data formattata DD/MM/YYYY
 */
export function formatDateForDisplay(dateString) {
  if (!dateString) return "";
  const [yyyy, mm, dd] = dateString.split("-");
  return `${padTwo(dd)}/${padTwo(mm)}/${yyyy}`;
}

/**
 * Formatta una data in formato lungo italiano (es: "lunedì 9 maggio 2026")
 * @param {string} dateString - Data in formato YYYY-MM-DD
 * @returns {string} Data formattata in italiano
 */
export function formatDateLong(dateString) {
  if (!dateString) return "";
  return new Date(dateString + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/**
 * Formatta un orario (es: "09:00" -> "9:00")
 * @param {string} timeString - Orario in formato HH:MM
 * @returns {string} Orario formattato senza zero iniziale
 */
export function formatTimeForDisplay(timeString) {
  if (!timeString) return "";
  return timeString.replace(/^0/, "");
}

/**
 * Genera un ID univoco
 * @returns {string} ID basato su timestamp + random
 */
export function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

/**
 * Controlla se una stringa è una email valida
 * @param {string} email - Email da validare
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Controlla se una stringa è un telefono valido
 * @param {string} phone - Telefono da validare
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const re = /^[\d\s\+\-\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

/**
 * Sanitizza una stringa per evitare XSS
 * @param {string} str - Stringa da sanitizzare
 * @returns {string} Stringa sanitizzata
 */
export function sanitizeString(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Truncate una stringa a una lunghezza massima
 * @param {string} str - Stringa da troncare
 * @param {number} length - Lunghezza massima
 * @returns {string} Stringa troncata
 */
export function truncateString(str, length = 50) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

/**
 * Converte un oggetto in query string
 * @param {object} params - Parametri da convertire
 * @returns {string} Query string (es: "?key=value&key2=value2")
 */
export function toQueryString(params) {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  
  return query ? `?${query}` : "";
}

/**
 * Deep merge di due oggetti
 * @param {object} target - Oggetto destinazione
 * @param {object} source - Oggetto sorgente
 * @returns {object} Oggetto mergiato
 */
export function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Sleep per un numero di millisecondi
 * @param {number} ms - Millisecondi da aspettare
 * @returns {Promise} Promise che si risolve dopo il timeout
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estrae il giorno della settimana da una data YYYY-MM-DD
 * @param {string} dateString - Data in formato YYYY-MM-DD
 * @returns {string} Nome del giorno in italiano
 */
export function getDayName(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("it-IT", { weekday: "long" });
}

/**
 * Verifica se una data è nel passato
 * @param {string} dateString - Data in formato YYYY-MM-DD
 * @returns {boolean}
 */
export function isPastDate(dateString) {
  if (!dateString) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString + "T00:00:00");
  return date < today;
}

/**
 * Verifica se una data è nel futuro
 * @param {string} dateString - Data in formato YYYY-MM-DD
 * @returns {boolean}
 */
export function isFutureDate(dateString) {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString + "T00:00:00");
  return date > today;
}

/**
 * Calcola la differenza in giorni tra due date
 * @param {string} date1 - Prima data YYYY-MM-DD
 * @param {string} date2 - Seconda data YYYY-MM-DD
 * @returns {number} Differenza in giorni
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formatta un numero come valuta Euro
 * @param {number} amount - Importo da formattare
 * @returns {string} Importo formattato (es: "€ 1.234,56")
 */
export function formatEuro(amount) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Capitalizza la prima lettera di ogni parola
 * @param {string} str - Stringa da capitalizzare
 * @returns {string} Stringa capitalizzata
 */
export function capitalizeWords(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Rimuove gli accenti da una stringa
 * @param {string} str - Stringa da normalizzare
 * @returns {string} Stringa senza accenti
 */
export function removeAccents(str) {
  if (!str) return "";
  const accents = {
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a",
    "è": "e", "é": "e", "ê": "e", "ë": "e",
    "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o",
    "ù": "u", "ú": "u", "û": "u", "ü": "u",
    "ç": "c", "ñ": "n"
  };
  
  return str.replace(/[àáâãäèéêëìíîïòóôõöùúûüçñ]/g, match => accents[match]);
}

/**
 * Genera uno slug da una stringa (per URL)
 * @param {string} str - Stringa da convertire in slug
 * @returns {string} Slug generato
 */
export function slugify(str) {
  if (!str) return "";
  return removeAccents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Logga un messaggio con timestamp
 * @param {string} level - Livello (info, warn, error)
 * @param {string} message - Messaggio da loggare
 * @param {object} data - Dati opzionali da loggare
 */
export function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export default {
  padTwo,
  formatDateForDisplay,
  formatDateLong,
  formatTimeForDisplay,
  generateId,
  isValidEmail,
  isValidPhone,
  sanitizeString,
  truncateString,
  toQueryString,
  deepMerge,
  sleep,
  getDayName,
  isPastDate,
  isFutureDate,
  daysBetween,
  formatEuro,
  capitalizeWords,
  removeAccents,
  slugify,
  log
};
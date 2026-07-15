// Middleware globale di gestione errori.
export function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: "Errore del server",
    error: err.message,
  });
}

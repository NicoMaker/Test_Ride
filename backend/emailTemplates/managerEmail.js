export function managerEmailTemplate({ companyName, booking, formattedDate, dateFormatted, pivaLine }) {
  const baseStyles = `
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif}
    table{border-collapse:collapse}
    a{color:#e63312;text-decoration:none}
  `;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Nuova Prenotazione – ${companyName}</title>
  <style>${baseStyles}</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <tr>
    <td style="background:#111111;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:4px;background:linear-gradient(90deg,#e63312,#ff4d2e);font-size:0;">&nbsp;</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:22px 36px;"><p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${companyName}</p><p style="margin:3px 0 0;font-size:8px;color:#777777;letter-spacing:3px;text-transform:uppercase;">Pannello Prenotazioni · Admin</p></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#1a1a1a;padding:16px 36px;border-bottom:2px solid #e63312;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;">📍 Nuova prenotazione ricevuta</p>
      <p style="margin:4px 0 0;font-size:11px;color:#aaaaaa;">${formattedDate} · ore <strong style="color:#e63312;">${booking.time}</strong> · ${booking.motorcycleBrand} ${booking.motorcycleModel}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 36px;background:#ffffff;">
      <p style="margin:0 0 8px;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Prenotazione</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border:1px solid #e8e8e8;border-radius:6px;">
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Data</td><td style="padding:10px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">${formattedDate} (${dateFormatted})</td></tr>
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Orario</td><td style="padding:10px 16px;font-size:15px;color:#e63312;font-weight:900;">${booking.time}</td></tr>
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;">Moto</td><td style="padding:10px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">${booking.motorcycleBrand} ${booking.motorcycleModel}</td></tr>
      </table>
      
      <p style="margin:0 0 8px;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Cliente</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;border:1px solid #e8e8e8;border-radius:6px;">
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Nome</td><td style="padding:10px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">${booking.nome} ${booking.cognome}</td></tr>
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Telefono</td><td style="padding:10px 16px;"><a href="tel:${(booking.telefono || "").replace(/\s/g, "")}" style="font-size:13px;color:#e63312;font-weight:700;">${booking.telefono}</a></td></tr>
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Email</td><td style="padding:10px 16px;"><a href="mailto:${booking.email}" style="font-size:13px;color:#e63312;font-weight:700;">${booking.email}</a></td></tr>
        <tr><td style="padding:10px 16px;font-size:11px;color:#888888;background:#f8f8f8;">Patente</td><td style="padding:10px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">Categoria ${booking.patente}</td></tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:4px 0;"><a href="tel:${(booking.telefono || "").replace(/\s/g, "")}" style="display:inline-block;background:#e63312;color:#ffffff;font-size:11px;font-weight:700;padding:11px 24px;border-radius:4px;margin-right:8px;">📞 Chiama</a><a href="mailto:${booking.email}" style="display:inline-block;background:#111111;color:#ffffff;font-size:11px;font-weight:700;padding:11px 24px;border-radius:4px;">✉ Scrivi Email</a></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#111111;padding:16px 36px;text-align:center;"><p style="margin:0;font-size:9px;color:white;">&copy; 2026 ${companyName}${pivaLine} · Sistema prenotazioni automatico</p></td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
export function clientEmailTemplate({ companyName, booking, formattedDate, fullAddress, mapsUrl, pivaLine, phone, email }) {
  const baseStyles = `
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    body{margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif}
    table{border-collapse:collapse}
    img{border:0;outline:none;text-decoration:none}
    a{color:#e63312;text-decoration:none}
  `;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Conferma Test Ride – ${companyName}</title>
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
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">${companyName}</p>
            <p style="margin:4px 0 0;font-size:9px;color:#888888;letter-spacing:3px;text-transform:uppercase;">Concessionaria Ufficiale Moto</p>
          </td>
          <td style="padding:28px 36px 28px 0;text-align:right;">
            <span style="display:inline-block;background:#e63312;color:#ffffff;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 12px;border-radius:3px;">Test Ride</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#e63312;padding:22px 36px;text-align:center;">
      <p style="margin:0;font-size:19px;font-weight:900;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">✓ Prenotazione Confermata!</p>
      <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">${formattedDate} &nbsp;·&nbsp; ore ${booking.time}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 36px;background:#ffffff;">
      <p style="margin:0 0 6px;font-size:15px;color:#1a1a1a;">Ciao <strong>${booking.nome} ${booking.cognome}</strong>,</p>
      <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.65;">la tua prenotazione per il test ride è stata <strong style="color:#1a1a1a;">confermata</strong>. Non vediamo l'ora di farti salire in sella!</p>
      
      <p style="margin:0 0 8px;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Dettagli Prenotazione</p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:11px 16px;font-size:12px;color:#888888;background:#f8f8f8;width:32%;border-bottom:1px solid #e8e8e8;">Data</td><td style="padding:11px 16px;font-size:13px;color:#1a1a1a;font-weight:700;border-bottom:1px solid #e8e8e8;">${formattedDate}</td></tr>
        <tr><td style="padding:11px 16px;font-size:12px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Orario</td><td style="padding:11px 16px;font-size:13px;color:#e63312;font-weight:900;">${booking.time}</td></tr>
        <tr><td style="padding:11px 16px;font-size:12px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Moto</td><td style="padding:11px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">${booking.motorcycleBrand} ${booking.motorcycleModel}</td></tr>
        <tr><td style="padding:11px 16px;font-size:12px;color:#888888;background:#f8f8f8;border-bottom:1px solid #e8e8e8;">Durata</td><td style="padding:11px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">30 minuti</td></tr>
        <tr><td style="padding:11px 16px;font-size:12px;color:#888888;background:#f8f8f8;">Patente</td><td style="padding:11px 16px;font-size:13px;color:#1a1a1a;font-weight:700;">Cat. ${booking.patente}</td></tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="background:#fff5f3;border-left:4px solid #e63312;padding:13px 16px;"><p style="margin:0;font-size:13px;color:#1a1a1a;">⚠ Presentati <strong>10 minuti prima</strong> con <strong>documento d'identità</strong> e <strong>patente</strong>.</p></td></tr>
      </table>
      
      <p style="margin:0 0 8px;font-size:9px;font-weight:700;color:#e63312;letter-spacing:2.5px;text-transform:uppercase;border-bottom:2px solid #e63312;padding-bottom:6px;">Dove Siamo</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e8e8e8;border-radius:6px;">
        <tr><td style="padding:14px 16px;background:#f8f8f8;"><p style="margin:0 0 3px;font-size:13px;color:#1a1a1a;font-weight:700;">📍 ${fullAddress}</p><a href="${mapsUrl}" style="font-size:11px;color:#e63312;font-weight:700;">Apri in Google Maps →</a></td></tr>
      </table>
      
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding-top:20px;border-top:1px solid #e8e8e8;"><p style="margin:0 0 5px;font-size:11px;color:#888888;">Per informazioni o modifiche:</p><p style="margin:0;font-size:13px;color:#1a1a1a;">📞 <a href="tel:${(phone || "").replace(/\s/g, "")}" style="color:#1a1a1a;font-weight:700;">${phone || ""}</a> &nbsp;&nbsp;&nbsp; ✉ <a href="mailto:${email || ""}" style="color:#e63312;font-weight:700;">${email || ""}</a></p></td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#111111;padding:18px 36px;text-align:center;">
      <p style="margin:0;font-size:10px;color:white;">&copy; 2026 ${companyName}${pivaLine} &nbsp;·&nbsp; Tutti i diritti riservati</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
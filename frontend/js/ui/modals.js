// ==================== LOADER & MODALI ====================

function showLoader(show) {
  document.getElementById("loader").classList.toggle("show", show);
}

function showSuccessModal(booking) {
  const [y, m, d] = booking.date.split("-");
  const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
  document.getElementById("successMessage").textContent =
    `Prenotazione confermata per il ${dateFormatted} alle ${booking.time}`;
  document.getElementById("successModal").classList.add("show");
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.remove("show");
}

function showErrorModal(message) {
  document.getElementById("errorMessage").innerHTML = message;
  document.getElementById("errorModal").classList.add("show");
}

function closeErrorModal() {
  document.getElementById("errorModal").classList.remove("show");
}

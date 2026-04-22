// ==================== MAIN APP INITIALIZATION ====================

function initSocket() {
  AppState.socket = io();

  AppState.socket.on("connect", () => setSocketStatus("connected"));
  AppState.socket.on("disconnect", () => setSocketStatus("disconnected"));
  AppState.socket.on("connect_error", () => setSocketStatus("disconnected"));

  AppState.socket.on("slots_update", (data) => {
    AppState.bookedSlots = data.bookedSlots || {};
    refreshTimeSlotsUI();
  });

  AppState.socket.on("new_booking", (booking) => {
    const key = makeSlotKey(booking.date, booking.motorcycleId);
    if (!AppState.bookedSlots[key]) AppState.bookedSlots[key] = [];
    if (!AppState.bookedSlots[key].includes(booking.time)) {
      AppState.bookedSlots[key].push(booking.time);
    }
    refreshTimeSlotsUI();

    const currentDate = document.getElementById("date").value;
    const currentMoto = AppState.formData.motorcycleId;
    const userTime = AppState.formData.selectedTime;

    if (
      booking.date === currentDate &&
      booking.motorcycleId === currentMoto &&
      booking.time === userTime
    ) {
      showConflictMessage(booking);
    }
  });
}

function setupEventListeners() {
  document
    .getElementById("testRideForm")
    .addEventListener("submit", handleFormSubmit);

  // Step navigation buttons
  document
    .getElementById("nextStep1Btn")
    .addEventListener("click", () => nextStep(1));
  document
    .getElementById("prevStep2Btn")
    .addEventListener("click", () => prevStep(2));
  document
    .getElementById("nextStep2Btn")
    .addEventListener("click", () => nextStep(2));
  document
    .getElementById("prevStep3Btn")
    .addEventListener("click", () => prevStep(3));
  document
    .getElementById("nextStep3Btn")
    .addEventListener("click", () => nextStep(3));
  document
    .getElementById("prevStep4Btn")
    .addEventListener("click", () => prevStep(4));

  const patenteEl = document.getElementById("patente");
  if (patenteEl) {
    patenteEl.addEventListener("change", () => {
      AppState.selectedMotoId = null;
      AppState.formData.motorcycleId = null;
      document.getElementById("nextStep2Btn").disabled = true;
      document.getElementById("motorcycleDetails").style.display = "none";
      renderMotorcyclesGrid();
      renderCategoryChips();
    });
  }

  const searchInput = document.getElementById("motorcycleSearch");
  const clearBtn = document.getElementById("clearSearchBtn");

  searchInput.addEventListener("input", (e) => {
    AppState.searchTerm = e.target.value;
    clearBtn.style.display = AppState.searchTerm ? "flex" : "none";
    renderMotorcyclesGrid();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    AppState.searchTerm = "";
    clearBtn.style.display = "none";
    renderMotorcyclesGrid();
  });

  // ===== MODAL CLOSE — event delegation su document =====
  // Gestisce tutti i pulsanti chiudi e il click sull'overlay con un unico listener,
  // evitando problemi di timing o di elementi non ancora nel DOM.
  document.addEventListener("click", (e) => {
    // Click sull'overlay (sfondo scuro)
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("show");
      return;
    }

    // Risali fino all'elemento con id (gestisce anche click su icone figlie)
    const el = e.target.closest(
      "#closeBookingsModal, #closeSuccessModal, #closeSuccessBtn, #closeErrorModal, #closeErrorBtn",
    );
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    switch (el.id) {
      case "closeBookingsModal":
        document.getElementById("bookingsModal").classList.remove("show");
        break;
      case "closeSuccessModal":
      case "closeSuccessBtn":
        document.getElementById("successModal").classList.remove("show");
        break;
      case "closeErrorModal":
      case "closeErrorBtn":
        document.getElementById("errorModal").classList.remove("show");
        break;
    }
  });
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  initSocket();
  await loadAllData();
  setupEventListeners();
  updateFormView();
});

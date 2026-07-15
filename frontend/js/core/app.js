// ==================== BOOTSTRAP & EVENT LISTENERS ====================

function setupEventListeners() {
  document
    .getElementById("testRideForm")
    .addEventListener("submit", handleFormSubmit);

  // Navigazione step
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

  // ===== Chiusura modali — event delegation su document =====
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("show");
      return;
    }

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

// Inizializzazione app
document.addEventListener("DOMContentLoaded", async () => {
  initSocket();
  await loadAllData();
  setupEventListeners();
  updateFormView();
});

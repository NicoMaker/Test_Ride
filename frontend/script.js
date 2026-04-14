// ==================== GLOBAL STATE ====================
let state = {
  currentStep: 1,
  formData: {},
  motorcycles: [],
  companyInfo: {},
  bookings: [],
  bookedSlots: {},
  socket: null,
  selectedMotoId: null,
  searchTerm: "",
  activeCategory: "",
};

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
  initSocket();
  await loadAllData();
  setupEventListeners();
  updateFormView();
});

// ==================== UTILITY ====================
function padTwo(n) {
  return String(n).padStart(2, "0");
}

function formatDateLabel(day, month, year) {
  return `${padTwo(day)}/${padTwo(month)}/${year}`;
}

function makeSlotKey(dateVal, motoId) {
  return `${dateVal}|${motoId}`;
}

function getTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = padTwo(now.getMonth() + 1);
  const d = padTwo(now.getDate());
  return `${y}-${m}-${d}`;
}

// ==================== SOCKET.IO ====================
function initSocket() {
  state.socket = io();

  state.socket.on("connect", () => setSocketStatus("connected"));
  state.socket.on("disconnect", () => setSocketStatus("disconnected"));
  state.socket.on("connect_error", () => setSocketStatus("disconnected"));

  state.socket.on("slots_update", (data) => {
    state.bookedSlots = data.bookedSlots || {};
    refreshTimeSlotsUI();
  });

  state.socket.on("new_booking", (booking) => {
    const key = makeSlotKey(booking.date, booking.motorcycleId);
    if (!state.bookedSlots[key]) state.bookedSlots[key] = [];
    if (!state.bookedSlots[key].includes(booking.time)) {
      state.bookedSlots[key].push(booking.time);
    }
    refreshTimeSlotsUI();

    const currentDate = document.getElementById("date").value;
    const currentMoto = state.formData.motorcycleId;
    const userTime = state.formData.selectedTime;

    if (booking.date === currentDate && booking.motorcycleId === currentMoto && booking.time === userTime) {
      showConflictMessage(booking);
    }
  });
}

function showConflictMessage(booking) {
  const userDate = document.getElementById("date").value;
  const userMoto = state.formData.motorcycleId;
  const userTime = state.formData.selectedTime;

  if (booking.date === userDate && booking.motorcycleId === userMoto && booking.time === userTime) {
    document.getElementById("time").value = "";
    state.formData.selectedTime = "";
    document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));

    const [y, m, d] = booking.date.split("-");
    const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;

    document.getElementById("errorMessage").innerHTML =
      `<strong>Orario non più disponibile</strong><br><br>` +
      `Lo slot delle <strong>${booking.time}</strong> del <strong>${dateFormatted}</strong> ` +
      `per la <strong>${booking.motorcycleBrand} ${booking.motorcycleModel}</strong> ` +
      `è stato appena prenotato da un altro utente.<br><br>` +
      `Per favore seleziona un orario diverso.`;

    document.getElementById("errorModal").classList.add("show");
    state.currentStep = 3;
    updateFormView();
  }
}

function setSocketStatus(status) {
  const el = document.getElementById("socketStatus");
  const label = el.querySelector(".socket-label");
  el.className = "socket-status socket-" + status;
  if (status === "connected") label.textContent = "In tempo reale";
  if (status === "disconnected") label.textContent = "Disconnesso";
  if (status === "connecting") label.textContent = "Connessione…";
}

// ==================== LOAD DATA ====================
async function loadAllData() {
  try {
    const companyRes = await fetch("/api/company-info");
    const companyData = await companyRes.json();
    state.companyInfo = companyData;
    applyCompanyInfo(companyData);

    const motoRes = await fetch("/api/motorcycles");
    state.motorcycles = await motoRes.json();
    renderMotorcyclesGrid();

    const bookRes = await fetch("/api/bookings");
    if (bookRes.ok) {
      state.bookings = await bookRes.json();
      rebuildBookedSlots();
    }
  } catch (error) {
    console.error("Errore caricamento:", error);
    showToast("Errore nel caricamento dei dati", "error");
  }
}

function applyCompanyInfo(data) {
  const c = data.company;
  const settings = data.testRideSettings;

  document.getElementById("companyName").textContent = c.name || "Palmino Motors";
  document.getElementById("companySubtitle").textContent = `${c.address} · ${c.city}`;
  document.getElementById("companyAddress").textContent = `${c.address}, ${c.city}${c.cap ? " " + c.cap : ""}`;

  if (c.mapsUrl) document.getElementById("companyMapsLink").href = c.mapsUrl;
  document.getElementById("companyPhoneLink").href = `tel:${(c.phone || "").replace(/\s/g, "")}`;
  document.getElementById("companyPhoneLink").textContent = c.phone || "";
  document.getElementById("companyEmailLink").href = `mailto:${c.email || ""}`;
  document.getElementById("companyEmailLink").textContent = c.email || "";

  if (c.piva) {
    document.getElementById("pivaRow").style.display = "flex";
    document.getElementById("companyPiva").textContent = `P. IVA ${c.piva}`;
    document.getElementById("footerPiva").style.display = "block";
    document.getElementById("footerPiva").textContent = `P. IVA ${c.piva}`;
  }

  if (c.whatsapp) {
    document.getElementById("whatsappLink").href = `https://wa.me/${c.whatsapp}?text=Ciao%2C%20vorrei%20informazioni%20sul%20Test%20Ride!`;
  }

  if (settings?.durationMinutes) {
    document.getElementById("durationLabel").textContent = settings.durationMinutes;
  }

  document.getElementById("footerText").textContent = `© 2026 ${c.name || "Palmino Motors"} · Tutti i diritti riservati`;

  if (settings?.daysAvailable) {
    loadDates(settings.daysAvailable, settings.defaultTimeSlots);
  }
}

function rebuildBookedSlots() {
  state.bookedSlots = {};
  state.bookings.forEach((b) => {
    const key = makeSlotKey(b.date, b.motorcycleId);
    if (!state.bookedSlots[key]) state.bookedSlots[key] = [];
    if (!state.bookedSlots[key].includes(b.time)) state.bookedSlots[key].push(b.time);
  });
}

// ==================== MOTORCYCLE GRID & SEARCH ====================
function motoAllowedForPatente(moto) {
  const patente = document.getElementById("patente").value;
  if (!patente || patente === "A") return true;
  if (patente === "A2") return moto.kw <= 35;
  if (patente === "A1") return moto.kw <= 11 && moto.cc <= 125;
  return true;
}

function getFilteredMotorcycles() {
  let filtered = state.motorcycles.filter(motoAllowedForPatente);

  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    filtered = filtered.filter(moto =>
      moto.brand.toLowerCase().includes(term) ||
      moto.model.toLowerCase().includes(term) ||
      (moto.category && moto.category.toLowerCase().includes(term))
    );
  }

  if (state.activeCategory) {
    filtered = filtered.filter(moto => moto.category === state.activeCategory);
  }

  return filtered;
}

function getAllCategories() {
  const categories = new Set();
  state.motorcycles.forEach(moto => {
    if (moto.category) categories.add(moto.category);
  });
  return Array.from(categories).sort();
}

function renderMotorcyclesGrid() {
  const grid = document.getElementById("motorcyclesGrid");
  const filtered = getFilteredMotorcycles();

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results"><i class="fas fa-motorcycle"></i><p>Nessuna moto trovata con questi filtri.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(moto => `
    <div class="moto-card ${state.selectedMotoId === moto.id ? 'selected' : ''}" data-id="${moto.id}">
      <div class="moto-info">
        <div class="moto-brand">${escapeHtml(moto.brand)}</div>
        <div class="moto-model">${escapeHtml(moto.model)}</div>
        <div class="moto-category">${escapeHtml(moto.category || '—')}</div>
      </div>
      <div class="moto-badge">${moto.cc} cc</div>
    </div>
  `).join('');

  document.querySelectorAll('.moto-card').forEach(card => {
    card.addEventListener('click', () => {
      const motoId = card.dataset.id;
      selectMotorcycle(motoId);
    });
  });
}

function selectMotorcycle(motoId) {
  state.selectedMotoId = motoId;
  const moto = state.motorcycles.find(m => m.id === motoId);

  if (moto) {
    state.formData.motorcycleId = motoId;
    state.formData.brand = moto.brand;
    state.formData.model = moto.model;
    state.formData.motorcycleCategory = moto.category;

    document.getElementById("brand").value = moto.brand;
    document.getElementById("model").value = motoId;

    displayMotorcycleDetails(moto);
    document.getElementById("nextStep2Btn").disabled = false;
    renderMotorcyclesGrid();
    refreshTimeSlotsUI();
  }
}

function displayMotorcycleDetails(moto) {
  const detailsDiv = document.getElementById("motorcycleDetails");
  document.getElementById("detailCategory").textContent = moto.category || "-";
  document.getElementById("detailCC").textContent = moto.cc + " cc";
  document.getElementById("detailPower").textContent = moto.power;
  document.getElementById("detailColor").textContent = moto.color;
  document.getElementById("detailYear").textContent = moto.year;

  const badge = document.getElementById("licenseBadge");
  const patente = document.getElementById("patente").value;
  const kw = moto.kw;

  let canRide = false;
  let reason = "";

  if (patente === "A") {
    canRide = true;
    reason = "Patente A — nessun limite di potenza.";
  } else if (patente === "A2") {
    canRide = kw <= 35;
    reason = canRide ? `${kw} kW ≤ 35 kW — rientra nel limite patente A2.` : `${kw} kW supera il limite di 35 kW per patente A2.`;
  } else if (patente === "A1") {
    canRide = kw <= 11 && moto.cc <= 125;
    if (!canRide) {
      const issues = [];
      if (kw > 11) issues.push(`${kw} kW supera il limite di 11 kW`);
      if (moto.cc > 125) issues.push(`${moto.cc} cc supera il limite di 125 cc`);
      reason = issues.join(" e ") + " per patente A1/B.";
    } else {
      reason = `${kw} kW ≤ 11 kW e ${moto.cc} cc ≤ 125 cc — rientra nel limite patente A1/B.`;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  const categories = getAllCategories();

  container.innerHTML = categories.map(cat => `
    <div class="category-chip ${state.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
      ${escapeHtml(cat)}
    </div>
  `).join('');

  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category;
      state.activeCategory = state.activeCategory === cat ? "" : cat;
      renderCategoryChips();
      renderMotorcyclesGrid();
    });
  });
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
  document.getElementById("testRideForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("patente").addEventListener("change", () => {
    state.selectedMotoId = null;
    state.formData.motorcycleId = null;
    document.getElementById("nextStep2Btn").disabled = true;
    document.getElementById("motorcycleDetails").style.display = "none";
    renderMotorcyclesGrid();
    renderCategoryChips();
  });

  const searchInput = document.getElementById("motorcycleSearch");
  const clearBtn = document.getElementById("clearSearchBtn");

  searchInput.addEventListener("input", (e) => {
    state.searchTerm = e.target.value;
    clearBtn.style.display = state.searchTerm ? "flex" : "none";
    renderMotorcyclesGrid();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.searchTerm = "";
    clearBtn.style.display = "none";
    renderMotorcyclesGrid();
  });

  document.getElementById("closeBookingsModal").addEventListener("click", () => {
    document.getElementById("bookingsModal").classList.remove("show");
  });

  document.getElementById("closeSuccessModal").addEventListener("click", closeSuccessModal);
  document.getElementById("closeSuccessBtn").addEventListener("click", closeSuccessModal);
  document.getElementById("closeErrorModal").addEventListener("click", closeErrorModal);
  document.getElementById("closeErrorBtn").addEventListener("click", closeErrorModal);

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) e.target.classList.remove("show");
  });
}

// ==================== FORM STEPS ====================
function nextStep(currentStep) {
  if (currentStep === 2 && !state.selectedMotoId) {
    showToast("Seleziona una moto prima di continuare", "warning");
    return;
  }

  if (validateStep(currentStep)) {
    saveStepData(currentStep);
    state.currentStep = currentStep + 1;
    updateFormView();
  }
}

function prevStep(currentStep) {
  state.currentStep = currentStep - 1;
  updateFormView();
}

function validateStep(step) {
  if (step === 3) {
    let isValid = true;
    if (!document.getElementById("date").value) {
      document.getElementById("dateError").textContent = "Seleziona una data";
      isValid = false;
    } else {
      document.getElementById("dateError").textContent = "";
    }
    if (!document.getElementById("time").value) {
      document.getElementById("timeError").textContent = "Seleziona un orario";
      isValid = false;
    } else {
      document.getElementById("timeError").textContent = "";
    }
    return isValid;
  }

  const inputs = document.getElementById(`step${step}`).querySelectorAll("[required]");
  let isValid = true;
  inputs.forEach((input) => {
    if (!validateInput(input)) isValid = false;
  });
  return isValid;
}

function validateInput(input) {
  const value = input.value.trim();
  const errorId = input.id + "Error";
  const errorElement = document.getElementById(errorId);
  let isValid = true;
  let errorMessage = "";

  if (!value) {
    isValid = false;
    errorMessage = "Questo campo è obbligatorio";
  } else {
    if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      isValid = false;
      errorMessage = "Email non valida";
    }
    if (input.type === "tel" && !/^[\d\s\+\-\(\)]+$/.test(value) && value.replace(/\D/g, "").length < 10) {
      isValid = false;
      errorMessage = "Numero di telefono non valido";
    }
  }

  if (errorElement) {
    errorElement.textContent = errorMessage;
    input.classList.toggle("error-field", !isValid);
  }
  return isValid;
}

function saveStepData(step) {
  if (step === 1) {
    state.formData.nome = document.getElementById("nome").value;
    state.formData.cognome = document.getElementById("cognome").value;
    state.formData.email = document.getElementById("email").value;
    state.formData.telefono = document.getElementById("telefono").value;
    state.formData.patente = document.getElementById("patente").value;
  } else if (step === 3) {
    state.formData.date = document.getElementById("date").value;
    state.formData.time = document.getElementById("time").value;
  }
}

function updateFormView() {
  document.querySelectorAll(".form-step").forEach((s) => s.classList.remove("active"));
  document.getElementById(`step${state.currentStep}`).classList.add("active");

  const progress = (state.currentStep / 4) * 100;
  document.getElementById("progressFill").style.width = progress + "%";
  document.getElementById("currentStep").textContent = state.currentStep;

  if (state.currentStep === 4) updateSummary();
  if (state.currentStep === 3) refreshTimeSlotsUI();
  if (state.currentStep === 2) {
    renderMotorcyclesGrid();
    renderCategoryChips();
  }
}

// ==================== DATE E ORARI ====================
let dateSlotsMap = {};

function getAutoSelectDate(availableDates) {
  if (!availableDates || availableDates.length === 0) return null;
  const today = getTodayLocal();
  const future = availableDates.filter((d) => d >= today);
  if (future.length > 0) return future[0];
  return availableDates[availableDates.length - 1];
}

function loadDates(daysAvailable, defaultTimeSlots) {
  const dateSelect = document.getElementById("date");
  const container = document.getElementById("dateSlotsContainer");
  dateSlotsMap = {};
  const availableDateValues = [];

  daysAvailable.forEach((day) => {
    if (!day.available) return;
    const month = padTwo(day.month);
    const d = padTwo(day.day);
    const value = `${day.year}-${month}-${d}`;
    const label = formatDateLabel(day.day, day.month, day.year);
    const slots = day.timeSlots && day.timeSlots.length ? day.timeSlots : defaultTimeSlots || [];
    dateSlotsMap[value] = slots;
    availableDateValues.push(value);

    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${day.dayName} ${label}`;
    dateSelect.appendChild(option);

    const card = document.createElement("div");
    card.className = "date-slot";
    card.dataset.value = value;
    card.innerHTML = `<span class="slot-day-name">${day.dayName}</span><span class="slot-date">${label}</span>`;
    card.addEventListener("click", () => selectDateCard(value, card));
    container.appendChild(card);
  });

  const autoDate = getAutoSelectDate(availableDateValues);
  if (autoDate) {
    const autoCard = container.querySelector(`[data-value="${autoDate}"]`);
    if (autoCard) selectDateCard(autoDate, autoCard, true);
  }
}

function selectDateCard(value, card, silent = false) {
  document.querySelectorAll(".date-slot").forEach((s) => s.classList.remove("selected"));
  card.classList.add("selected");
  document.getElementById("date").value = value;
  state.formData.selectedDate = value;
  if (!silent) document.getElementById("dateError").textContent = "";

  loadTimeSlotsForDate(value);

  const time = document.getElementById("time").value;
  const slots = dateSlotsMap[value] || [];
  if (time && !slots.includes(time)) {
    document.getElementById("time").value = "";
    state.formData.selectedTime = "";
    document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
  }
}

function loadTimeSlotsForDate(dateVal) {
  const slots = dateSlotsMap[dateVal] || [];
  const timeSelect = document.getElementById("time");
  const container = document.getElementById("timeSlotsContainer");

  timeSelect.innerHTML = '<option value="">Seleziona orario...</option>';
  slots.forEach((slot) => {
    const opt = document.createElement("option");
    opt.value = slot;
    opt.textContent = slot;
    timeSelect.appendChild(opt);
  });

  container.innerHTML = "";
  const motoId = state.formData.motorcycleId;
  const key = dateVal && motoId ? makeSlotKey(dateVal, motoId) : null;
  const booked = key ? state.bookedSlots[key] || [] : [];

  slots.forEach((slot) => {
    const btn = document.createElement("div");
    const isBooked = booked.includes(slot);
    btn.className = "time-slot" + (isBooked ? " booked" : "");
    btn.textContent = slot;
    btn.dataset.slot = slot;

    if (!isBooked) {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        btn.classList.add("selected");
        document.getElementById("time").value = slot;
        state.formData.selectedTime = slot;
        document.getElementById("timeError").textContent = "";
      });
    }

    container.appendChild(btn);
  });
}

function refreshTimeSlotsUI() {
  const dateVal = document.getElementById("date").value;
  if (!dateVal) return;

  const motoId = state.formData.motorcycleId;
  const key = motoId ? makeSlotKey(dateVal, motoId) : null;
  const booked = key ? state.bookedSlots[key] || [] : [];

  const btns = document.querySelectorAll("#timeSlotsContainer .time-slot");
  if (btns.length === 0 && dateVal) {
    loadTimeSlotsForDate(dateVal);
    return;
  }

  btns.forEach((btn) => {
    const slot = btn.dataset.slot;
    if (!slot) return;
    const wasSelected = btn.classList.contains("selected");
    const isBooked = booked.includes(slot);
    btn.classList.toggle("booked", isBooked);

    if (isBooked && wasSelected) {
      btn.classList.remove("selected");
      document.getElementById("time").value = "";
      state.formData.selectedTime = "";
    }
  });
}

// ==================== SUMMARY ====================
function updateSummary() {
  document.getElementById("summaryNome").textContent = state.formData.nome || "-";
  document.getElementById("summaryCognome").textContent = state.formData.cognome || "-";
  document.getElementById("summaryEmail").textContent = state.formData.email || "-";
  document.getElementById("summaryTelefono").textContent = state.formData.telefono || "-";
  document.getElementById("summaryPatente").textContent = state.formData.patente || "-";

  const moto = state.motorcycles.find(m => m.id === state.formData.motorcycleId);
  document.getElementById("summaryBrand").textContent = state.formData.brand || "-";
  document.getElementById("summaryModel").textContent = moto ? moto.model : "-";
  document.getElementById("summaryCategory").textContent = moto ? moto.category : "-";

  const dateVal = document.getElementById("date").value;
  let dateText = "-";
  if (dateVal) {
    const [y, m, d] = dateVal.split("-");
    const dateObj = new Date(dateVal + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("it-IT", { weekday: "long" });
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    dateText = `${cap(dayName)} ${padTwo(d)}/${padTwo(m)}/${y}`;
  }
  document.getElementById("summaryDate").textContent = dateText;
  document.getElementById("summaryTime").textContent = state.formData.selectedTime || "-";
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!document.getElementById("terms").checked) {
    document.getElementById("termsError").textContent = "Devi accettare i termini e le condizioni";
    return;
  }

  const dateVal = document.getElementById("date").value;
  const time = state.formData.selectedTime;
  const motoId = state.formData.motorcycleId;
  const key = makeSlotKey(dateVal, motoId);

  if (state.bookedSlots[key] && state.bookedSlots[key].includes(time)) {
    const [y, m, d] = dateVal.split("-");
    const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
    const moto = state.motorcycles.find((mo) => mo.id === motoId);
    const motoName = moto ? `${moto.brand} ${moto.model}` : "questa moto";

    document.getElementById("errorMessage").innerHTML =
      `<strong>Orario non disponibile</strong><br><br>` +
      `Lo slot delle <strong>${time}</strong> del <strong>${dateFormatted}</strong> ` +
      `per la <strong>${motoName}</strong> è già stato prenotato.<br><br>` +
      `Per favore seleziona un orario diverso.`;

    document.getElementById("errorModal").classList.add("show");
    document.getElementById("time").value = "";
    state.formData.selectedTime = "";
    document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
    state.currentStep = 3;
    updateFormView();
    return;
  }

  showLoader(true);

  try {
    const moto = state.motorcycles.find((m) => m.id === motoId);
    const booking = {
      id: Date.now().toString(),
      nome: state.formData.nome,
      cognome: state.formData.cognome,
      email: state.formData.email,
      telefono: state.formData.telefono,
      patente: state.formData.patente,
      motorcycleId: motoId,
      motorcycleBrand: state.formData.brand,
      motorcycleModel: moto ? moto.model : "",
      motorcycleCategory: moto ? moto.category : "",
      date: dateVal,
      time: time,
      timestamp: new Date().toLocaleString("it-IT"),
    };

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking, companyInfo: state.companyInfo }),
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        const [y, m, d] = dateVal.split("-");
        const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
        document.getElementById("errorMessage").innerHTML =
          `<strong>Orario non più disponibile</strong><br><br>` +
          `Un altro utente ha prenotato lo slot delle <strong>${time}</strong> ` +
          `del <strong>${dateFormatted}</strong> per la ` +
          `<strong>${booking.motorcycleBrand} ${booking.motorcycleModel}</strong> ` +
          `pochi istanti prima di te.<br><br>` +
          `Per favore seleziona un orario diverso.`;

        document.getElementById("errorModal").classList.add("show");
        if (!state.bookedSlots[key]) state.bookedSlots[key] = [];
        if (!state.bookedSlots[key].includes(time)) state.bookedSlots[key].push(time);
        document.getElementById("time").value = "";
        state.formData.selectedTime = "";
        document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        refreshTimeSlotsUI();
        state.currentStep = 3;
        updateFormView();
      } else {
        throw new Error(result.message || "Errore prenotazione");
      }
      showLoader(false);
      return;
    }

    showLoader(false);
    showSuccessModal(booking);
    resetForm();
  } catch (error) {
    showLoader(false);
    console.error("Errore nella prenotazione:", error);
    document.getElementById("errorMessage").innerHTML = error.message || "Errore durante la prenotazione. Riprovare.";
    document.getElementById("errorModal").classList.add("show");
  }
}

function resetForm() {
  document.getElementById("testRideForm").reset();
  state.currentStep = 1;
  state.formData = {};
  state.selectedMotoId = null;
  state.searchTerm = "";
  state.activeCategory = "";

  document.getElementById("motorcycleDetails").style.display = "none";
  document.getElementById("nextStep2Btn").disabled = true;
  if (document.getElementById("motorcycleSearch")) {
    document.getElementById("motorcycleSearch").value = "";
  }
  if (document.getElementById("clearSearchBtn")) {
    document.getElementById("clearSearchBtn").style.display = "none";
  }

  document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
  document.querySelectorAll(".date-slot").forEach((s) => s.classList.remove("selected"));
  document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
  document.getElementById("timeSlotsContainer").innerHTML = "";

  const settings = state.companyInfo?.testRideSettings;
  if (settings?.daysAvailable) {
    document.getElementById("dateSlotsContainer").innerHTML = "";
    document.getElementById("date").innerHTML = '<option value="">Seleziona data...</option>';
    dateSlotsMap = {};
    loadDates(settings.daysAvailable, settings.defaultTimeSlots);
  }

  renderMotorcyclesGrid();
  renderCategoryChips();
  updateFormView();
}

// ==================== MODALS ====================
function showSuccessModal(booking) {
  const [y, m, d] = booking.date.split("-");
  const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
  document.getElementById("successMessage").textContent = `Prenotazione confermata per il ${dateFormatted} alle ${booking.time}`;
  document.getElementById("successModal").classList.add("show");
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.remove("show");
}

function closeErrorModal() {
  document.getElementById("errorModal").classList.remove("show");
}

function showLoader(show) {
  document.getElementById("loader").classList.toggle("show", show);
}

function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = { info: "fa-info-circle", success: "fa-check-circle", warning: "fa-exclamation-triangle", error: "fa-times-circle" }[type] || "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut .35s ease both";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
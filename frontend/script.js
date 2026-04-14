// ==================== GLOBAL STATE ====================
let state = {
  currentStep: 1,
  formData: {},
  motorcycles: [],
  companyInfo: {},
  bookings: [],        // prenotazioni caricate dal server
  bookedSlots: {},     // { "YYYY-MM-DD|motoId": ["09:00", ...] }
  socket: null
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  initSocket();
  await loadAllData();
  setupEventListeners();
  updateFormView();
});

// ==================== UTILITY ====================
function padTwo(n) { return String(n).padStart(2, '0'); }

function formatDateLabel(day, month, year) {
  return `${padTwo(day)}/${padTwo(month)}/${year}`;
}

function makeDateKey(dateVal) {
  return dateVal; // già "YYYY-MM-DD"
}

function makeSlotKey(dateVal, motoId) {
  return `${dateVal}|${motoId}`;
}

// ==================== SOCKET.IO ====================
function initSocket() {
  state.socket = io();

  state.socket.on('connect', () => {
    setSocketStatus('connected');
  });

  state.socket.on('disconnect', () => {
    setSocketStatus('disconnected');
  });

  state.socket.on('connect_error', () => {
    setSocketStatus('disconnected');
  });

  // Il server invia lo stato completo degli slot occupati
  state.socket.on('slots_update', (data) => {
    // data: { bookedSlots: { "YYYY-MM-DD|motoId": ["09:00", ...] } }
    state.bookedSlots = data.bookedSlots || {};
    refreshTimeSlotsUI();
  });

  // Nuova prenotazione da un altro client
  state.socket.on('new_booking', (booking) => {
    const key = makeSlotKey(booking.date, booking.motorcycleId);
    if (!state.bookedSlots[key]) state.bookedSlots[key] = [];
    if (!state.bookedSlots[key].includes(booking.time)) {
      state.bookedSlots[key].push(booking.time);
    }
    refreshTimeSlotsUI();
    showToast(`Slot ${booking.time} appena prenotato per ${booking.motorcycleBrand} ${booking.motorcycleModel}`, 'info');
  });
}

function setSocketStatus(status) {
  const el = document.getElementById('socketStatus');
  const label = el.querySelector('.socket-label');
  el.className = 'socket-status socket-' + status;
  if (status === 'connected')    label.textContent = 'In tempo reale';
  if (status === 'disconnected') label.textContent = 'Disconnesso';
  if (status === 'connecting')   label.textContent = 'Connessione…';
}

// ==================== LOAD DATA ====================
async function loadAllData() {
  try {
    const companyRes = await fetch('/api/company-info');
    const companyData = await companyRes.json();
    state.companyInfo = companyData;
    applyCompanyInfo(companyData);

    const motoRes = await fetch('/api/motorcycles');
    state.motorcycles = await motoRes.json();
    loadBrands();

    // Carica prenotazioni esistenti per slot bloccati
    const bookRes = await fetch('/api/bookings');
    if (bookRes.ok) {
      state.bookings = await bookRes.json();
      rebuildBookedSlots();
    }

  } catch (error) {
    console.error('Errore caricamento:', error);
    showToast('Errore nel caricamento dei dati', 'error');
  }
}

function applyCompanyInfo(data) {
  const c = data.company;
  const settings = data.testRideSettings;

  // Navbar / sidebar
  const name = c.name || 'Palmino Motors';
  document.getElementById('companyName').textContent = name;
  document.getElementById('companySubtitle').textContent =
    `${c.address} · ${c.city}`;

  document.getElementById('companyAddress').textContent =
    `${c.address}, ${c.city}${c.cap ? ' ' + c.cap : ''}`;

  if (c.mapsUrl) {
    document.getElementById('companyMapsLink').href = c.mapsUrl;
  }

  const phoneLink = document.getElementById('companyPhoneLink');
  phoneLink.href = `tel:${(c.phone || '').replace(/\s/g, '')}`;
  phoneLink.textContent = c.phone || '';

  const emailLink = document.getElementById('companyEmailLink');
  emailLink.href = `mailto:${c.email || ''}`;
  emailLink.textContent = c.email || '';

  // P.IVA
  if (c.piva) {
    const pivaRow = document.getElementById('pivaRow');
    pivaRow.style.display = 'flex';
    document.getElementById('companyPiva').textContent = `P. IVA ${c.piva}`;

    const footerPiva = document.getElementById('footerPiva');
    footerPiva.style.display = 'block';
    footerPiva.textContent = `P. IVA ${c.piva}`;
  }

  // WhatsApp
  if (c.whatsapp) {
    document.getElementById('whatsappLink').href =
      `https://wa.me/${c.whatsapp}?text=Ciao%2C%20vorrei%20informazioni%20sul%20Test%20Ride!`;
  }

  // Durata
  if (settings && settings.durationMinutes) {
    document.getElementById('durationLabel').textContent = settings.durationMinutes;
  }

  // Footer
  document.getElementById('footerText').textContent =
    `© 2026 ${name} · Tutti i diritti riservati`;

  // Date disponibili
  if (settings && settings.daysAvailable) {
    loadDates(settings.daysAvailable, settings.defaultTimeSlots);
  }
}

// Ricostruisce bookedSlots da state.bookings
function rebuildBookedSlots() {
  state.bookedSlots = {};
  state.bookings.forEach(b => {
    const key = makeSlotKey(b.date, b.motorcycleId);
    if (!state.bookedSlots[key]) state.bookedSlots[key] = [];
    if (!state.bookedSlots[key].includes(b.time)) {
      state.bookedSlots[key].push(b.time);
    }
  });
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
  document.getElementById('testRideForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('brand').addEventListener('change', handleBrandChange);
  document.getElementById('model').addEventListener('change', handleModelChange);
  document.getElementById('patente').addEventListener('change', handlePatenteChange);
  document.getElementById('date').addEventListener('change', handleDateChange);
  document.getElementById('time').addEventListener('change', handleTimeChange);

  document.getElementById('closeBookingsModal').addEventListener('click', () => {
    document.getElementById('bookingsModal').classList.remove('show');
  });

  document.getElementById('closeSuccessModal').addEventListener('click', closeSuccessModal);
  document.getElementById('closeSuccessBtn').addEventListener('click', closeSuccessModal);
  document.getElementById('closeErrorModal').addEventListener('click', closeErrorModal);
  document.getElementById('closeErrorBtn').addEventListener('click', closeErrorModal);

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('show');
    }
  });
}

// ==================== FORM STEPS ====================
function nextStep(currentStep) {
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
    if (!document.getElementById('date').value) {
      document.getElementById('dateError').textContent = 'Seleziona una data';
      isValid = false;
    } else {
      document.getElementById('dateError').textContent = '';
    }
    if (!document.getElementById('time').value) {
      document.getElementById('timeError').textContent = 'Seleziona un orario';
      isValid = false;
    } else {
      document.getElementById('timeError').textContent = '';
    }
    return isValid;
  }

  const inputs = document.getElementById(`step${step}`).querySelectorAll('[required]');
  let isValid = true;
  inputs.forEach(input => { if (!validateInput(input)) isValid = false; });
  return isValid;
}

function validateInput(input) {
  const value = input.value.trim();
  const errorId = input.id + 'Error';
  const errorElement = document.getElementById(errorId);
  let isValid = true;
  let errorMessage = '';

  if (!value) {
    isValid = false;
    errorMessage = 'Questo campo è obbligatorio';
  } else {
    if (input.type === 'email' && !isValidEmail(value)) {
      isValid = false; errorMessage = 'Email non valida';
    }
    if (input.type === 'tel' && !isValidPhone(value)) {
      isValid = false; errorMessage = 'Numero di telefono non valido';
    }
  }

  if (errorElement) {
    errorElement.textContent = errorMessage;
    input.classList.toggle('error-field', !isValid);
  }
  return isValid;
}

function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function isValidPhone(phone) {
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g,'').length >= 10;
}

function saveStepData(step) {
  if (step === 1) {
    state.formData.nome     = document.getElementById('nome').value;
    state.formData.cognome  = document.getElementById('cognome').value;
    state.formData.email    = document.getElementById('email').value;
    state.formData.telefono = document.getElementById('telefono').value;
    state.formData.patente  = document.getElementById('patente').value;
  } else if (step === 2) {
    state.formData.brand = document.getElementById('brand').value;
    state.formData.model = document.getElementById('model').value;
  } else if (step === 3) {
    state.formData.date = document.getElementById('date').value;
    state.formData.time = document.getElementById('time').value;
  }
}

function updateFormView() {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${state.currentStep}`).classList.add('active');

  const progress = (state.currentStep / 4) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('currentStep').textContent = state.currentStep;

  if (state.currentStep === 4) updateSummary();
  // Aggiorna slot quando si torna allo step 3
  if (state.currentStep === 3) refreshTimeSlotsUI();
}

// ==================== MOTORCYCLES ====================
function motoAllowedForPatente(moto) {
  const patente = document.getElementById('patente').value;
  if (!patente) return true;
  if (patente === 'A') return true;
  if (patente === 'A2') return moto.kw <= 35;
  if (patente === 'A1') return moto.kw <= 11 && moto.cc <= 125;
  return true;
}

function loadBrands() {
  const allowed = state.motorcycles.filter(motoAllowedForPatente);
  const brands = [...new Set(allowed.map(m => m.brand))].sort();
  const brandSelect = document.getElementById('brand');
  brandSelect.innerHTML = '<option value="">Seleziona marca...</option>';

  if (brands.length === 0) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = 'Nessuna moto disponibile per la tua patente';
    brandSelect.appendChild(opt);
    return;
  }

  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });
}

function handleBrandChange() {
  const brand = document.getElementById('brand').value;
  const modelSelect = document.getElementById('model');
  modelSelect.innerHTML = '<option value="">Seleziona modello...</option>';
  document.getElementById('motorcycleDetails').classList.remove('show');

  if (brand) {
    const models = state.motorcycles
      .filter(m => m.brand === brand && motoAllowedForPatente(m))
      .sort((a, b) => a.model.localeCompare(b.model));

    models.forEach(moto => {
      const option = document.createElement('option');
      option.value = moto.id;
      option.textContent = moto.model;
      modelSelect.appendChild(option);
    });
  }

  // Resetta slot se già selezionati
  refreshTimeSlotsUI();
}

function handlePatenteChange() {
  loadBrands();
  document.getElementById('brand').value = '';
  document.getElementById('model').innerHTML = '<option value="">Seleziona modello...</option>';
  document.getElementById('motorcycleDetails').classList.remove('show');
  document.getElementById('licenseBadge').style.display = 'none';
  state.formData.motorcycleId = null;
}

function handleModelChange() {
  const modelId = document.getElementById('model').value;
  if (modelId) {
    const moto = state.motorcycles.find(m => m.id === modelId);
    if (moto) {
      displayMotorcycleDetails(moto);
      state.formData.motorcycleId = modelId;
      state.formData.motorcycleCategory = moto.category;
      // Aggiorna slot occupati per questa moto
      refreshTimeSlotsUI();
    }
  } else {
    document.getElementById('motorcycleDetails').classList.remove('show');
  }
}

function displayMotorcycleDetails(moto) {
  document.getElementById('detailCategory').textContent = moto.category || '-';
  document.getElementById('detailCC').textContent = moto.cc + ' cc';
  document.getElementById('detailPower').textContent = moto.power;
  document.getElementById('detailColor').textContent = moto.color;
  document.getElementById('detailYear').textContent = moto.year;

  const badge = document.getElementById('licenseBadge');
  const patente = document.getElementById('patente').value;
  const kw = moto.kw;
  let canRide = false;
  let reason = '';

  if (patente === 'A') {
    canRide = true;
    reason = 'Patente A — nessun limite di potenza.';
  } else if (patente === 'A2') {
    canRide = kw <= 35;
    reason = canRide
      ? `${kw} kW ≤ 35 kW — rientra nel limite patente A2.`
      : `${kw} kW supera il limite di 35 kW per patente A2.`;
  } else if (patente === 'A1') {
    canRide = kw <= 11 && moto.cc <= 125;
    if (!canRide) {
      const issues = [];
      if (kw > 11) issues.push(`${kw} kW supera il limite di 11 kW`);
      if (moto.cc > 125) issues.push(`${moto.cc} cc supera il limite di 125 cc`);
      reason = issues.join(' e ') + ' per patente A1/B.';
    } else {
      reason = `${kw} kW ≤ 11 kW e ${moto.cc} cc ≤ 125 cc — rientra nel limite patente A1/B.`;
    }
  } else {
    badge.style.display = 'none';
    document.getElementById('motorcycleDetails').classList.add('show');
    return;
  }


  document.getElementById('motorcycleDetails').classList.add('show');
}

// ==================== DATE E ORARI ====================

// Mappa: dateValue => array timeSlots specifici per quel giorno
let dateSlotsMap = {};

function loadDates(daysAvailable, defaultTimeSlots) {
  const dateSelect = document.getElementById('date');
  const container = document.getElementById('dateSlotsContainer');
  dateSlotsMap = {};

  daysAvailable.forEach(day => {
    if (!day.available) return;

    const month = padTwo(day.month);
    const d = padTwo(day.day);
    const value = `${day.year}-${month}-${d}`;
    const label = formatDateLabel(day.day, day.month, day.year);

    // Orari: usa quelli custom del giorno o quelli di default
    const slots = (day.timeSlots && day.timeSlots.length) ? day.timeSlots : (defaultTimeSlots || []);
    dateSlotsMap[value] = slots;

    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${day.dayName} ${label}`;
    dateSelect.appendChild(option);

    const card = document.createElement('div');
    card.className = 'date-slot';
    card.dataset.value = value;
    card.innerHTML = `
      <span class="slot-day-name">${day.dayName}</span>
      <span class="slot-date">${label}</span>`;

    card.addEventListener('click', () => {
      document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));
      card.classList.add('selected');
      dateSelect.value = value;
      state.formData.selectedDate = value;
      document.getElementById('dateError').textContent = '';
      loadTimeSlotsForDate(value);

      // Deseleziona orario precedente se non valido per nuovo giorno
      const time = document.getElementById('time').value;
      const slots = dateSlotsMap[value] || [];
      if (!slots.includes(time)) {
        document.getElementById('time').value = '';
        state.formData.selectedTime = '';
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      }
    });

    container.appendChild(card);
  });
}

function loadTimeSlotsForDate(dateVal) {
  const slots = dateSlotsMap[dateVal] || [];
  const timeSelect = document.getElementById('time');
  const container = document.getElementById('timeSlotsContainer');

  // Ricostruisce le opzioni del select hidden
  timeSelect.innerHTML = '<option value="">Seleziona orario...</option>';
  slots.forEach(slot => {
    const opt = document.createElement('option');
    opt.value = slot; opt.textContent = slot;
    timeSelect.appendChild(opt);
  });

  // Ricostruisce i pulsanti visivi
  container.innerHTML = '';
  const motoId = state.formData.motorcycleId;
  const key = dateVal && motoId ? makeSlotKey(dateVal, motoId) : null;
  const booked = key ? (state.bookedSlots[key] || []) : [];

  slots.forEach(slot => {
    const btn = document.createElement('div');
    const isBooked = booked.includes(slot);
    btn.className = 'time-slot' + (isBooked ? ' booked' : '');
    btn.textContent = slot;
    btn.dataset.slot = slot;

    if (!isBooked) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('time').value = slot;
        state.formData.selectedTime = slot;
        document.getElementById('timeError').textContent = '';
      });
    }

    container.appendChild(btn);
  });
}

// Aggiorna lo stato visivo degli slot senza ricostruire tutto
function refreshTimeSlotsUI() {
  const dateVal = document.getElementById('date').value;
  if (!dateVal) return;

  const motoId = state.formData.motorcycleId ||
    document.getElementById('model').value || null;

  const key = motoId ? makeSlotKey(dateVal, motoId) : null;
  const booked = key ? (state.bookedSlots[key] || []) : [];

  const btns = document.querySelectorAll('#timeSlotsContainer .time-slot');
  btns.forEach(btn => {
    const slot = btn.dataset.slot;
    if (!slot) return;

    const wasSelected = btn.classList.contains('selected');
    const isBooked = booked.includes(slot);

    btn.classList.toggle('booked', isBooked);

    if (isBooked && wasSelected) {
      btn.classList.remove('selected');
      document.getElementById('time').value = '';
      state.formData.selectedTime = '';
      showToast(`L'orario ${slot} è stato appena prenotato da un altro utente`, 'warning');
    }

    // Riaggiungi listener solo se non occupato e non già presente
    if (!isBooked && !btn._listenerAttached) {
      btn._listenerAttached = true;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('time').value = slot;
        state.formData.selectedTime = slot;
        document.getElementById('timeError').textContent = '';
      });
    }
  });

  // Se non ci sono slot renderizzati ancora, caricali
  if (btns.length === 0 && dateVal) {
    loadTimeSlotsForDate(dateVal);
  }
}

function handleDateChange() {
  const date = document.getElementById('date').value;
  if (date) {
    state.formData.selectedDate = date;
    loadTimeSlotsForDate(date);
  }
}

function handleTimeChange() {
  const time = document.getElementById('time').value;
  if (time) {
    state.formData.selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(s => {
      s.classList.toggle('selected', s.dataset.slot === time);
    });
  }
}

// ==================== SUMMARY ====================
function updateSummary() {
  document.getElementById('summaryNome').textContent    = state.formData.nome    || '-';
  document.getElementById('summaryCognome').textContent = state.formData.cognome || '-';
  document.getElementById('summaryEmail').textContent   = state.formData.email   || '-';
  document.getElementById('summaryTelefono').textContent= state.formData.telefono|| '-';
  document.getElementById('summaryPatente').textContent = state.formData.patente  || '-';

  const modelId = state.formData.motorcycleId;
  const moto = state.motorcycles.find(m => m.id === modelId);

  document.getElementById('summaryBrand').textContent   = document.getElementById('brand').value || '-';
  document.getElementById('summaryModel').textContent   = moto ? moto.model    : '-';
  document.getElementById('summaryCategory').textContent= moto ? moto.category : '-';

  const dateVal = document.getElementById('date').value;
  let dateText = '-';
  if (dateVal) {
    const [y, m, d] = dateVal.split('-');
    const dateObj = new Date(dateVal + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long' });
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    dateText = `${cap(dayName)} ${padTwo(d)}/${padTwo(m)}/${y}`;
  }

  document.getElementById('summaryDate').textContent = dateText;
  document.getElementById('summaryTime').textContent = state.formData.selectedTime || '-';
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!document.getElementById('terms').checked) {
    document.getElementById('termsError').textContent = 'Devi accettare i termini e le condizioni';
    return;
  }

  // Controlla che lo slot sia ancora libero prima di inviare
  const dateVal = document.getElementById('date').value;
  const time    = state.formData.selectedTime;
  const motoId  = state.formData.motorcycleId;
  const key     = makeSlotKey(dateVal, motoId);

  if (state.bookedSlots[key] && state.bookedSlots[key].includes(time)) {
    showToast('Questo slot è già stato prenotato. Seleziona un altro orario.', 'error');
    state.currentStep = 3;
    updateFormView();
    return;
  }

  showLoader(true);

  try {
    const modelSelect = document.getElementById('model');
    const moto = state.motorcycles.find(m => m.id === motoId);
    const modelText = modelSelect.options[modelSelect.selectedIndex]?.text || '';

    const booking = {
      id: Date.now().toString(),
      nome:             state.formData.nome,
      cognome:          state.formData.cognome,
      email:            state.formData.email,
      telefono:         state.formData.telefono,
      patente:          state.formData.patente,
      motorcycleId:     motoId,
      motorcycleBrand:  document.getElementById('brand').value,
      motorcycleModel:  modelText,
      motorcycleCategory: moto ? moto.category : '',
      date:             dateVal,
      time:             time,
      timestamp:        new Date().toLocaleString('it-IT')
    };

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking, companyInfo: state.companyInfo })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Errore prenotazione');
    }

    showLoader(false);
    showSuccessModal(booking);
    resetForm();

  } catch (error) {
    showLoader(false);
    console.error('Errore nella prenotazione:', error);
    showErrorModal(error.message || 'Errore durante la prenotazione. Riprovare.');
  }
}

function resetForm() {
  document.getElementById('testRideForm').reset();
  state.currentStep = 1;
  state.formData = {};

  document.getElementById('motorcycleDetails').classList.remove('show');
  document.getElementById('model').innerHTML = '<option value="">Seleziona modello...</option>';
  document.getElementById('licenseBadge').style.display = 'none';

  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));
  document.querySelectorAll('.error').forEach(el => el.textContent = '');
  document.getElementById('timeSlotsContainer').innerHTML = '';

  updateFormView();
}

// ==================== MODALS ====================
function showSuccessModal(booking) {
  const [y, m, d] = booking.date.split('-');
  const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
  document.getElementById('successMessage').textContent =
    `Prenotazione confermata per il ${dateFormatted} alle ${booking.time}`;
  document.getElementById('successModal').classList.add('show');
}

function closeSuccessModal() { document.getElementById('successModal').classList.remove('show'); }

function showErrorModal(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorModal').classList.add('show');
}

function closeErrorModal() { document.getElementById('errorModal').classList.remove('show'); }

function showLoader(show) { document.getElementById('loader').classList.toggle('show', show); }

// ==================== TOAST ====================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle' }[type] || 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut .35s ease both';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
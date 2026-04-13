// Global State
let state = {
  currentStep: 1,
  formData: {},
  motorcycles: [],
  companyInfo: {},
  bookings: []
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  initializeForm();
  setupEventListeners();
});

// ==================== UTILITY: PAD DATE ====================
function padTwo(n) {
  return String(n).padStart(2, '0');
}

function formatDateLabel(day, month, year) {
  return `${padTwo(day)}/${padTwo(month)}/${year}`;
}

// ==================== LOAD ALL DATA ====================
async function loadAllData() {
  try {
    const companyRes = await fetch('company-info.json');
    const companyData = await companyRes.json();
    state.companyInfo = companyData;

    document.getElementById('companyAddress').textContent =
      `${companyData.company.address}, ${companyData.company.city}`;

    const phoneLink = document.getElementById('companyPhoneLink');
    phoneLink.href = `tel:${companyData.company.phone.replace(/\s/g, '')}`;
    phoneLink.textContent = companyData.company.phone;

    const emailLink = document.getElementById('companyEmailLink');
    emailLink.href = `mailto:${companyData.company.email}`;
    emailLink.textContent = companyData.company.email;

    if (companyData.company.mapsUrl) {
      const mapsLink = document.getElementById('companyMapsLink');
      if (mapsLink) mapsLink.href = companyData.company.mapsUrl;
    }

    if (companyData.company.whatsapp) {
      const waLink = document.getElementById('whatsappLink');
      if (waLink) {
        waLink.href = `https://wa.me/${companyData.company.whatsapp}?text=Ciao%2C%20vorrei%20informazioni%20sul%20Test%20Ride!`;
      }
    }

    loadDates(companyData.testRideSettings.daysAvailable);
    loadTimeSlots(companyData.testRideSettings.timeSlots);

    const motoRes = await fetch('motorcycles.json');
    state.motorcycles = await motoRes.json();

    loadBrands();

  } catch (error) {
    console.error('Errore nel caricamento della configurazione:', error);
    showErrorModal('Errore nel caricamento della configurazione');
  }
}

// ==================== INITIALIZE FORM ====================
function initializeForm() {
  const saved = localStorage.getItem('testRideBookings');
  state.bookings = saved ? JSON.parse(saved) : [];
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

  inputs.forEach(input => {
    if (!validateInput(input)) {
      isValid = false;
    }
  });

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
    switch (input.type) {
      case 'email':
        if (!isValidEmail(value)) {
          isValid = false;
          errorMessage = 'Email non valida';
        }
        break;
      case 'tel':
        if (!isValidPhone(value)) {
          isValid = false;
          errorMessage = 'Numero di telefono non valido';
        }
        break;
    }
  }

  if (errorElement) {
    errorElement.textContent = errorMessage;
    input.classList.toggle('error-field', !isValid);
  }

  return isValid;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function saveStepData(step) {
  if (step === 1) {
    state.formData.nome = document.getElementById('nome').value;
    state.formData.cognome = document.getElementById('cognome').value;
    state.formData.email = document.getElementById('email').value;
    state.formData.telefono = document.getElementById('telefono').value;
    state.formData.patente = document.getElementById('patente').value;
  } else if (step === 2) {
    state.formData.brand = document.getElementById('brand').value;
    state.formData.model = document.getElementById('model').value;
  } else if (step === 3) {
    state.formData.date = document.getElementById('date').value;
    state.formData.time = document.getElementById('time').value;
  }
}

function updateFormView() {
  document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
  document.getElementById(`step${state.currentStep}`).classList.add('active');

  const progress = (state.currentStep / 4) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('currentStep').textContent = state.currentStep;

  if (state.currentStep === 4) {
    updateSummary();
  }
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
    if (kw <= 35) {
      canRide = true;
      reason = `${kw} kW ≤ 35 kW — rientra nel limite patente A2.`;
    } else {
      canRide = false;
      reason = `${kw} kW supera il limite di 35 kW per patente A2.`;
    }
  } else if (patente === 'A1') {
    if (kw <= 11 && moto.cc <= 125) {
      canRide = true;
      reason = `${kw} kW ≤ 11 kW e ${moto.cc} cc ≤ 125 cc — rientra nel limite patente A1/B.`;
    } else {
      canRide = false;
      const issues = [];
      if (kw > 11) issues.push(`${kw} kW supera il limite di 11 kW`);
      if (moto.cc > 125) issues.push(`${moto.cc} cc supera il limite di 125 cc`);
      reason = issues.join(' e ') + ' per patente A1/B.';
    }
  } else {
    badge.style.display = 'none';
    document.getElementById('motorcycleDetails').classList.add('show');
    return;
  }


  document.getElementById('motorcycleDetails').classList.add('show');
}

// ==================== DATES AND TIMES ====================
function loadDates(daysAvailable) {
  const dateSelect = document.getElementById('date');
  const container = document.getElementById('dateSlotsContainer');

  daysAvailable.forEach(day => {
    if (!day.available) return;

    const month = padTwo(day.month);
    const d = padTwo(day.day);
    const value = `${day.year}-${month}-${d}`;
    // FIX: sempre 09/05 e 10/05 con zero iniziale
    const label = formatDateLabel(day.day, day.month, day.year);

    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${day.dayName} ${label}`;
    dateSelect.appendChild(option);

    const card = document.createElement('div');
    card.className = 'date-slot';
    card.dataset.value = value;
    card.innerHTML = `
      <span class="slot-day-name">${day.dayName}</span>
      <span class="slot-date">${label}</span>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));
      card.classList.add('selected');
      dateSelect.value = value;
      state.formData.selectedDate = value;
      document.getElementById('dateError').textContent = '';
    });
    container.appendChild(card);
  });
}

function handleDateChange() {
  const date = document.getElementById('date').value;
  if (date) {
    state.formData.selectedDate = date;
  }
}

function loadTimeSlots(slots) {
  const timeSelect = document.getElementById('time');
  const container = document.getElementById('timeSlotsContainer');

  slots.forEach(slot => {
    const option = document.createElement('option');
    option.value = slot;
    option.textContent = slot;
    timeSelect.appendChild(option);
  });

  container.innerHTML = '';
  slots.forEach(slot => {
    const btn = document.createElement('div');
    btn.className = 'time-slot';
    btn.textContent = slot;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('time').value = slot;
      state.formData.selectedTime = slot;
      document.getElementById('timeError').textContent = '';
    });
    container.appendChild(btn);
  });
}

function handleTimeChange() {
  const time = document.getElementById('time').value;
  if (time) {
    state.formData.selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(s => {
      s.classList.toggle('selected', s.textContent === time);
    });
  }
}

// ==================== SUMMARY ====================
function updateSummary() {
  document.getElementById('summaryNome').textContent = state.formData.nome || '-';
  document.getElementById('summaryCognome').textContent = state.formData.cognome || '-';
  document.getElementById('summaryEmail').textContent = state.formData.email || '-';
  document.getElementById('summaryTelefono').textContent = state.formData.telefono || '-';
  document.getElementById('summaryPatente').textContent = state.formData.patente || '-';

  const brand = document.getElementById('brand').value;
  const modelId = state.formData.motorcycleId;
  const moto = state.motorcycles.find(m => m.id === modelId);

  document.getElementById('summaryBrand').textContent = brand || '-';
  document.getElementById('summaryModel').textContent = moto ? moto.model : '-';
  document.getElementById('summaryCategory').textContent = moto ? moto.category : '-';

  // FIX: mostra data con zero iniziale nel riepilogo
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

  showLoader(true);

  try {
    const modelSelect = document.getElementById('model');
    const modelId = modelSelect.value;
    const moto = state.motorcycles.find(m => m.id === modelId);
    const modelText = modelSelect.options[modelSelect.selectedIndex]?.text || '';

    const booking = {
      id: Date.now(),
      ...state.formData,
      date: document.getElementById('date').value,
      time: state.formData.selectedTime,
      motorcycleBrand: document.getElementById('brand').value,
      motorcycleModel: modelText,
      motorcycleCategory: moto ? moto.category : '',
      timestamp: new Date().toLocaleString('it-IT')
    };

    state.bookings.push(booking);
    localStorage.setItem('testRideBookings', JSON.stringify(state.bookings));

    await sendConfirmationEmail(booking);

    showLoader(false);
    showSuccessModal(booking);
    resetForm();
  } catch (error) {
    showLoader(false);
    console.error('Errore nella prenotazione:', error);
    showErrorModal('Si è verificato un errore durante la prenotazione. Riprovare.');
  }
}

async function sendConfirmationEmail(booking) {
  const emailData = {
    to: booking.email,
    cc: state.companyInfo.managers.map(m => m.email).join(', '),
    nome: booking.nome,
    cognome: booking.cognome,
    email: booking.email,
    telefono: booking.telefono,
    patente: booking.patente,
    motorcycleBrand: booking.motorcycleBrand,
    motorcycleModel: booking.motorcycleModel,
    motorcycleCategory: booking.motorcycleCategory,
    date: booking.date,
    time: booking.time,
    companyInfo: state.companyInfo.company,
    managers: state.companyInfo.managers
  };

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) throw new Error('Email non inviata');
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

  updateFormView();
}

// ==================== MODALS ====================
function showSuccessModal(booking) {
  const [y, m, d] = booking.date.split('-');
  const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
  document.getElementById('successMessage').textContent =
    `La tua prenotazione è confermata per il ${dateFormatted} alle ${booking.time}`;
  document.getElementById('successModal').classList.add('show');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('show');
}

function showErrorModal(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorModal').classList.add('show');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('show');
}

function showLoader(show) {
  document.getElementById('loader').classList.toggle('show', show);
}

// ==================== UTILITIES ====================
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
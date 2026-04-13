// Global State
let state = {
  currentStep: 1,
  formData: {},
  motorcycles: [],
  categories: [],
  companyInfo: {},
  bookings: []
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  initializeForm();
  setupEventListeners();
});

// ==================== LOAD ALL DATA ====================
async function loadAllData() {
  try {
    // Load company info
    const companyRes = await fetch('company-info.json');
    const companyData = await companyRes.json();
    state.companyInfo = companyData;

    // Update UI with company info
    document.getElementById('companyAddress').textContent =
      `${companyData.company.address}, ${companyData.company.city}`;

    const phoneLink = document.getElementById('companyPhoneLink');
    phoneLink.href = `tel:${companyData.company.phone.replace(/\s/g, '')}`;
    phoneLink.textContent = companyData.company.phone;

    const emailLink = document.getElementById('companyEmailLink');
    emailLink.href = `mailto:${companyData.company.email}`;
    emailLink.textContent = companyData.company.email;

    // Maps link
    if (companyData.company.mapsUrl) {
      const mapsLink = document.getElementById('companyMapsLink');
      if (mapsLink) mapsLink.href = companyData.company.mapsUrl;
    }

    // WhatsApp link
    if (companyData.company.whatsapp) {
      const waLink = document.getElementById('whatsappLink');
      if (waLink) {
        waLink.href = `https://wa.me/${companyData.company.whatsapp}?text=Ciao%2C%20vorrei%20informazioni%20sul%20Test%20Ride!`;
      }
    }

    // Load dates and time slots from company info
    loadDates(companyData.testRideSettings.daysAvailable);
    loadTimeSlots(companyData.testRideSettings.timeSlots);

    // Load motorcycles from separate file
    const motoRes = await fetch('motorcycles.json');
    state.motorcycles = await motoRes.json();

    // Load categories from separate file
    const catRes = await fetch('motorcycle-categories.json');
    state.categories = await catRes.json();

    // Populate brands
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

  // Modal close buttons
  document.getElementById('closeBookingsModal').addEventListener('click', () => {
    document.getElementById('bookingsModal').classList.remove('show');
  });

  document.getElementById('closeSuccessModal').addEventListener('click', closeSuccessModal);
  document.getElementById('closeSuccessBtn').addEventListener('click', closeSuccessModal);

  document.getElementById('closeErrorModal').addEventListener('click', closeErrorModal);
  document.getElementById('closeErrorBtn').addEventListener('click', closeErrorModal);

  // Close modal clicking outside
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
  // Step 3 uses visual slot pickers, validate manually
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
// Returns true if the moto is allowed for the selected patente
function motoAllowedForPatente(moto) {
  const patente = document.getElementById('patente').value;
  if (!patente) return true; // no license selected yet, show all
  if (patente === 'A') return true;
  if (patente === 'A2') return moto.kw <= 35;
  if (patente === 'A1') return moto.kw <= 11 && moto.cc <= 125;
  return true;
}

function loadBrands() {
  const patente = document.getElementById('patente').value;
  const allowed = state.motorcycles.filter(motoAllowedForPatente);
  const brands = [...new Set(allowed.map(m => m.brand))].sort();
  const brandSelect = document.getElementById('brand');

  // Keep placeholder, remove old options
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
  // Reload brands filtered by new patente
  loadBrands();
  // Reset model selection and details
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
    }
  } else {
    document.getElementById('motorcycleDetails').classList.remove('show');
  }
}

function displayMotorcycleDetails(moto) {
  document.getElementById('detailCC').textContent = moto.cc + ' cc';
  document.getElementById('detailPower').textContent = moto.power;
  document.getElementById('detailColor').textContent = moto.color;
  document.getElementById('detailYear').textContent = moto.year;

  // Category description
  const category = state.categories.find(c => c.id === moto.categoryId);
  document.getElementById('detailDescription').textContent =
    category ? `Categoria: ${category.name}` : '';

  // License compatibility based on kW
  const badge = document.getElementById('licenseBadge');
  const patente = document.getElementById('patente').value;
  const kw = moto.kw;

  // Italian license rules:
  // A1: max 11 kW, max 125cc, max 0.1 kW/kg
  // A2: max 35 kW, max 70 kW/kg ratio (not 2x unrestricted)
  // A: unlimited
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
      reason = `${kw} kW ≤ 11 kW e ${moto.cc} cc ≤ 125 cc — rientra nel limite patente A1.`;
    } else {
      canRide = false;
      const issues = [];
      if (kw > 11) issues.push(`${kw} kW supera il limite di 11 kW`);
      if (moto.cc > 125) issues.push(`${moto.cc} cc supera il limite di 125 cc`);
      reason = issues.join(' e ') + ' per patente A1.';
    }
  } else {
    badge.style.display = 'none';
    document.getElementById('motorcycleDetails').classList.add('show');
    return;
  }

  badge.style.display = 'flex';
  badge.className = `license-badge compatible`;
  badge.innerHTML = `<i class="fas fa-check-circle"></i>
     <span class="badge-text">
       Compatibile con patente <strong>${patente}</strong>
       <small>${kw} kW${patente === 'A1' ? ` · ${moto.cc} cc` : ''}</small>
     </span>`;

  document.getElementById('motorcycleDetails').classList.add('show');
}

// ==================== DATES AND TIMES ====================
function loadDates(daysAvailable) {
  const dateSelect = document.getElementById('date');
  const container = document.getElementById('dateSlotsContainer');

  daysAvailable.forEach(day => {
    if (!day.available) return;

    const month = day.month.padStart(2, '0');
    const d = day.day.padStart(2, '0');
    const value = `${day.year}-${month}-${d}`;
    const label = `${day.day}/${day.month}/${day.year}`;

    // Add to hidden select for validation
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${day.dayName} ${label}`;
    dateSelect.appendChild(option);

    // Render clickable card
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

  // Populate select
  slots.forEach(slot => {
    const option = document.createElement('option');
    option.value = slot;
    option.textContent = slot;
    timeSelect.appendChild(option);
  });

  // Populate clickable time slots grid
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
    });
    container.appendChild(btn);
  });
}

function handleTimeChange() {
  const time = document.getElementById('time').value;
  if (time) {
    state.formData.selectedTime = time;
    // Sync with visual slots
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

  const dateSelect = document.getElementById('date');
  const dateText = dateSelect.options[dateSelect.selectedIndex]?.text || '-';
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
    const modelText = modelSelect.options[modelSelect.selectedIndex]?.text || '';

    const booking = {
      id: Date.now(),
      ...state.formData,
      date: document.getElementById('date').value,
      time: state.formData.selectedTime,
      motorcycleBrand: document.getElementById('brand').value,
      motorcycleModel: modelText,
      timestamp: new Date().toLocaleString('it-IT')
    };

    state.bookings.push(booking);
    localStorage.setItem('testRideBookings', JSON.stringify(state.bookings));

    // Try to send email (non-blocking)
    sendConfirmationEmail(booking).catch(err => console.warn('Email non inviata:', err));

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
    subject: 'Conferma Test Ride - Palmino Motors',
    nome: booking.nome,
    cognome: booking.cognome,
    email: booking.email,
    telefono: booking.telefono,
    patente: booking.patente,
    motorcycleBrand: booking.motorcycleBrand,
    motorcycleModel: booking.motorcycleModel,
    date: booking.date,
    time: booking.time,
    companyInfo: state.companyInfo.company
  };

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) throw new Error('Email non inviata');
}

function resetForm() {
  // Reset native form inputs
  document.getElementById('testRideForm').reset();

  // Reset state
  state.currentStep = 1;
  state.formData = {};

  // Reset motorcycle section
  document.getElementById('motorcycleDetails').classList.remove('show');
  document.getElementById('model').innerHTML = '<option value="">Seleziona modello...</option>';
  document.getElementById('licenseBadge').style.display = 'none';

  // Reset visual time slots
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));

  // Reset visual date slots
  document.querySelectorAll('.date-slot').forEach(s => s.classList.remove('selected'));

  // Clear all error messages
  document.querySelectorAll('.error').forEach(el => el.textContent = '');

  // Go back to step 1
  updateFormView();
}

// ==================== MODALS ====================
function showSuccessModal(booking) {
  document.getElementById('successMessage').textContent =
    `La tua prenotazione è confermata per ${formatDate(booking.date)} alle ${booking.time}`;
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
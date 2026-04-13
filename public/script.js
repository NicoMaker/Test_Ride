// Global State
let state = {
  currentStep: 1,
  formData: {},
  motorcycles: [],
  companyInfo: {}
};

// ==================== INIT ==================== 
document.addEventListener('DOMContentLoaded', async () => {
  await loadCompanyInfo();
  initializeForm();
  setupEventListeners();
  loadBookings();
});

// ==================== LOAD COMPANY INFO ==================== 
async function loadCompanyInfo() {
  try {
    const response = await fetch('company-info.json');
    const data = await response.json();
    state.companyInfo = data;
    state.motorcycles = data.motorcycles;
    
    // Populate company info in UI
    document.getElementById('companyAddress').textContent = 
      `${data.company.address}, ${data.company.city}`;
    document.getElementById('companyPhone').textContent = data.company.phone;
    document.getElementById('companyEmail').textContent = data.company.email;
    
    // Load available dates
    loadDates(data.testRideSettings.daysAvailable);
    // Load brands
    loadBrands();
    // Load time slots
    loadTimeSlots(data.testRideSettings.timeSlots);
  } catch (error) {
    console.error('Errore nel caricamento della configurazione:', error);
    showError('Errore nel caricamento della configurazione');
  }
}

// ==================== INITIALIZE FORM ==================== 
function initializeForm() {
  // Load bookings from localStorage
  const savedBookings = localStorage.getItem('testRideBookings');
  if (savedBookings) {
    state.bookings = JSON.parse(savedBookings);
  } else {
    state.bookings = [];
  }
}

// ==================== SETUP EVENT LISTENERS ==================== 
function setupEventListeners() {
  // Form submission
  document.getElementById('testRideForm').addEventListener('submit', handleFormSubmit);
  
  // Brand and Model selection
  document.getElementById('brand').addEventListener('change', handleBrandChange);
  document.getElementById('model').addEventListener('change', handleModelChange);
  
  // Date and Time selection
  document.getElementById('date').addEventListener('change', handleDateChange);
  document.getElementById('time').addEventListener('change', handleTimeChange);
  
  // Modal controls
  document.getElementById('viewBookingsBtn').addEventListener('click', showBookingsModal);
  document.getElementById('closeBookingsModal').addEventListener('click', closeModal);
  document.getElementById('closeSuccessModal').addEventListener('click', closeSuccessModal);
  document.getElementById('closeErrorModal').addEventListener('click', closeErrorModal);
  document.getElementById('closeSuccessBtn').addEventListener('click', closeSuccessModal);
  document.getElementById('closeErrorBtn').addEventListener('click', closeErrorModal);
  
  // Close modal when clicking outside
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
      case 'text':
        if (input.id === 'patente' && value.length < 2) {
          isValid = false;
          errorMessage = 'Patente non valida';
        }
        break;
    }
  }
  
  if (errorElement) {
    errorElement.textContent = errorMessage;
    input.classList.toggle('error', !isValid);
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
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show current step
  document.getElementById(`step${state.currentStep}`).classList.add('active');
  
  // Update progress bar
  const progress = (state.currentStep / 4) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('currentStep').textContent = state.currentStep;
  
  // Update summary if on last step
  if (state.currentStep === 4) {
    updateSummary();
  }
}

// ==================== MOTORCYCLES HANDLING ==================== 
function loadBrands() {
  const brands = [...new Set(state.motorcycles.map(m => m.brand))].sort();
  const brandSelect = document.getElementById('brand');
  
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
  
  // Clear models
  modelSelect.innerHTML = '<option value="">Seleziona modello...</option>';
  
  if (brand) {
    const models = state.motorcycles
      .filter(m => m.brand === brand)
      .sort((a, b) => a.model.localeCompare(b.model));
    
    models.forEach(moto => {
      const option = document.createElement('option');
      option.value = moto.id;
      option.textContent = moto.model;
      modelSelect.appendChild(option);
    });
  }
}

function handleModelChange() {
  const modelId = document.getElementById('model').value;
  
  if (modelId) {
    const moto = state.motorcycles.find(m => m.id === modelId);
    if (moto) {
      displayMotorcycleDetails(moto);
      state.formData.motorcycleId = modelId;
    }
  }
}

function displayMotorcycleDetails(moto) {
  const detailsContainer = document.getElementById('motorcycleDetails');
  
  document.getElementById('detailCC').textContent = moto.cc + ' cc';
  document.getElementById('detailPower').textContent = moto.power;
  document.getElementById('detailColor').textContent = moto.color;
  document.getElementById('detailYear').textContent = moto.year;
  document.getElementById('detailDescription').textContent = moto.description;
  
  detailsContainer.classList.add('show');
}

// ==================== DATES AND TIMES ==================== 
function loadDates(daysAvailable) {
  const dateSelect = document.getElementById('date');
  
  daysAvailable.forEach(day => {
    if (day.available) {
      const date = new Date(`${day.year}-${day.month.padStart(2, '0')}-${day.day.padStart(2, '0')}`);
      const option = document.createElement('option');
      option.value = date.toISOString().split('T')[0];
      option.textContent = `${day.dayName} ${day.day}/${day.month}/${day.year}`;
      dateSelect.appendChild(option);
    }
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
  
  slots.forEach(slot => {
    const option = document.createElement('option');
    option.value = slot;
    option.textContent = slot;
    timeSelect.appendChild(option);
  });
}

function handleTimeChange() {
  const time = document.getElementById('time').value;
  if (time) {
    state.formData.selectedTime = time;
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
  
  const dateValue = document.getElementById('date').value;
  const dateText = document.getElementById('date').options[document.getElementById('date').selectedIndex].text;
  document.getElementById('summaryDate').textContent = dateText || '-';
  
  document.getElementById('summaryTime').textContent = state.formData.selectedTime || '-';
}

// ==================== FORM SUBMISSION ==================== 
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Validate last step
  if (!document.getElementById('terms').checked) {
    document.getElementById('termsError').textContent = 'Devi accettare i termini e le condizioni';
    return;
  }
  
  showLoader(true);
  
  try {
    // Save booking
    const booking = {
      id: Date.now(),
      ...state.formData,
      date: document.getElementById('date').value,
      time: state.formData.selectedTime,
      motorcycleBrand: document.getElementById('brand').value,
      motorcycleModel: document.getElementById('model').options[document.getElementById('model').selectedIndex].text,
      timestamp: new Date().toLocaleString('it-IT')
    };
    
    // Save to localStorage
    state.bookings.push(booking);
    localStorage.setItem('testRideBookings', JSON.stringify(state.bookings));
    
    // Send email
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
  try {
    const emailData = {
      to: booking.email,
      cc: state.companyInfo.managers.map(m => m.email).join(', '),
      subject: 'Conferma Test Ride - Moto Rossi',
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      throw new Error('Errore nell\'invio dell\'email');
    }
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    // Non bloccare la prenotazione se l'email fallisce
  }
}

function resetForm() {
  document.getElementById('testRideForm').reset();
  state.currentStep = 1;
  state.formData = {};
  document.getElementById('motorcycleDetails').classList.remove('show');
  document.getElementById('model').innerHTML = '<option value="">Seleziona modello...</option>';
  updateFormView();
}

// ==================== BOOKINGS MODAL ==================== 
function showBookingsModal() {
  const modal = document.getElementById('bookingsModal');
  const tbody = document.getElementById('bookingsTableBody');
  const noData = document.getElementById('noBookings');
  
  if (state.bookings && state.bookings.length > 0) {
    tbody.innerHTML = '';
    noData.style.display = 'none';
    
    state.bookings.forEach(booking => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.nome} ${booking.cognome}</td>
        <td>${booking.email}</td>
        <td>${booking.motorcycleBrand} ${booking.motorcycleModel}</td>
        <td>${formatDate(booking.date)}</td>
        <td>${booking.time}</td>
        <td>
          <button class="delete-btn" onclick="deleteBooking(${booking.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } else {
    tbody.innerHTML = '';
    noData.style.display = 'block';
  }
  
  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('bookingsModal').classList.remove('show');
}

function deleteBooking(id) {
  if (confirm('Sei sicuro di voler eliminare questa prenotazione?')) {
    state.bookings = state.bookings.filter(b => b.id !== id);
    localStorage.setItem('testRideBookings', JSON.stringify(state.bookings));
    showBookingsModal();
  }
}

function loadBookings() {
  const saved = localStorage.getItem('testRideBookings');
  if (saved) {
    state.bookings = JSON.parse(saved);
  }
}

// ==================== MODALS ==================== 
function showSuccessModal(booking) {
  const modal = document.getElementById('successModal');
  document.getElementById('successMessage').textContent = 
    `La tua prenotazione è confermata per ${formatDate(booking.date)} alle ${booking.time}`;
  modal.classList.add('show');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('show');
}

function showErrorModal(message) {
  const modal = document.getElementById('errorModal');
  document.getElementById('errorMessage').textContent = message;
  modal.classList.add('show');
}

function closeErrorModal() {
  document.getElementById('errorModal').classList.remove('show');
}

function showError(message) {
  showErrorModal(message);
}

function showLoader(show) {
  const loader = document.getElementById('loader');
  if (show) {
    loader.classList.add('show');
  } else {
    loader.classList.remove('show');
  }
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
// ==================== FORM HANDLING ====================

function nextStep(currentStep) {
  if (currentStep === 2 && !AppState.selectedMotoId) {
    showToast("Seleziona una moto prima di continuare", "warning");
    return;
  }

  if (validateStep(currentStep)) {
    saveStepData(currentStep);
    AppState.currentStep = currentStep + 1;
    updateFormView();
  }
}

function prevStep(currentStep) {
  AppState.currentStep = currentStep - 1;
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
    AppState.formData.nome = document.getElementById("nome").value;
    AppState.formData.cognome = document.getElementById("cognome").value;
    AppState.formData.email = document.getElementById("email").value;
    AppState.formData.telefono = document.getElementById("telefono").value;
  } else if (step === 3) {
    AppState.formData.date = document.getElementById("date").value;
    AppState.formData.time = document.getElementById("time").value;
  }
}

function resetForm() {
  document.getElementById("testRideForm").reset();
  AppState.currentStep = 1;
  AppState.formData = {};
  AppState.selectedMotoId = null;
  AppState.searchTerm = "";
  AppState.activeCategory = "";

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

  const settings = AppState.companyInfo?.testRideSettings;
  if (settings?.daysAvailable) {
    document.getElementById("dateSlotsContainer").innerHTML = "";
    document.getElementById("date").innerHTML = '<option value="">Seleziona data...</option>';
    AppState.dateSlotsMap = {};
    loadDates(settings.daysAvailable, settings.defaultTimeSlots);
  }

  renderMotorcyclesGrid();
  renderCategoryChips();
  updateFormView();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!document.getElementById("terms").checked) {
    document.getElementById("termsError").textContent = "Devi accettare i termini e le condizioni";
    return;
  }

  const dateVal = document.getElementById("date").value;
  const time = AppState.formData.selectedTime;
  const motoId = AppState.formData.motorcycleId;
  const key = makeSlotKey(dateVal, motoId);

  if (AppState.bookedSlots[key] && AppState.bookedSlots[key].includes(time)) {
    const [y, m, d] = dateVal.split("-");
    const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
    const moto = AppState.motorcycles.find((mo) => mo.id === motoId);
    const motoName = moto ? `${moto.brand} ${moto.model}` : "questa moto";

    showErrorModal(
      `<strong>Orario non disponibile</strong><br><br>` +
      `Lo slot delle <strong>${time}</strong> del <strong>${dateFormatted}</strong> ` +
      `per la <strong>${motoName}</strong> è già stato prenotato.<br><br>` +
      `Per favore seleziona un orario diverso.`
    );
    document.getElementById("time").value = "";
    AppState.formData.selectedTime = "";
    document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
    AppState.currentStep = 3;
    updateFormView();
    return;
  }

  showLoader(true);

  try {
    const moto = AppState.motorcycles.find((m) => m.id === motoId);
    const booking = {
      id: Date.now().toString(),
      nome: AppState.formData.nome,
      cognome: AppState.formData.cognome,
      email: AppState.formData.email,
      telefono: AppState.formData.telefono,
      motorcycleId: motoId,
      motorcycleBrand: AppState.formData.brand,
      motorcycleModel: moto ? moto.model : "",
      motorcycleCategory: moto ? moto.category : "",
      date: dateVal,
      time: time,
      timestamp: new Date().toLocaleString("it-IT"),
    };

    const response = await submitBooking(booking);
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        const [y, m, d] = dateVal.split("-");
        const dateFormatted = `${padTwo(d)}/${padTwo(m)}/${y}`;
        showErrorModal(
          `<strong>Orario non più disponibile</strong><br><br>` +
          `Un altro utente ha prenotato lo slot delle <strong>${time}</strong> ` +
          `del <strong>${dateFormatted}</strong> per la ` +
          `<strong>${booking.motorcycleBrand} ${booking.motorcycleModel}</strong> ` +
          `pochi istanti prima di te.<br><br>` +
          `Per favore seleziona un orario diverso.`
        );
        if (!AppState.bookedSlots[key]) AppState.bookedSlots[key] = [];
        if (!AppState.bookedSlots[key].includes(time)) AppState.bookedSlots[key].push(time);
        document.getElementById("time").value = "";
        AppState.formData.selectedTime = "";
        document.querySelectorAll(".time-slot").forEach((s) => s.classList.remove("selected"));
        refreshTimeSlotsUI();
        AppState.currentStep = 3;
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
    showErrorModal(error.message || "Errore durante la prenotazione. Riprovare.");
  }
}
// ==================== MOTORCYCLES MANAGEMENT ====================

function motoAllowedForPatente(moto) {
  const patente = document.getElementById("patente").value;
  if (!patente || patente === "A") return true;
  if (patente === "A2") return moto.kw <= 35;
  if (patente === "A1") return moto.kw <= 11 && moto.cc <= 125;
  return true;
}

function getFilteredMotorcycles() {
  let filtered = AppState.motorcycles.filter(motoAllowedForPatente);

  if (AppState.searchTerm) {
    const term = AppState.searchTerm.toLowerCase();
    filtered = filtered.filter(moto =>
      moto.brand.toLowerCase().includes(term) ||
      moto.model.toLowerCase().includes(term) ||
      (moto.category && moto.category.toLowerCase().includes(term))
    );
  }

  if (AppState.activeCategory) {
    filtered = filtered.filter(moto => moto.category === AppState.activeCategory);
  }

  return filtered;
}

function getAllCategories() {
  const categories = new Set();
  AppState.motorcycles.forEach(moto => {
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
    <div class="moto-card ${AppState.selectedMotoId === moto.id ? 'selected' : ''}" data-id="${moto.id}">
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
  AppState.selectedMotoId = motoId;
  const moto = AppState.motorcycles.find(m => m.id === motoId);

  if (moto) {
    AppState.formData.motorcycleId = motoId;
    AppState.formData.brand = moto.brand;
    AppState.formData.model = moto.model;
    AppState.formData.motorcycleCategory = moto.category;

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
  detailsDiv.style.display = "block";
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

  badge.style.display = "flex";
  badge.className = `license-badge ${canRide ? 'compatible' : 'incompatible'}`;
  badge.innerHTML = `<i class="fas ${canRide ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>${reason}`;
}

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  const categories = getAllCategories();

  container.innerHTML = categories.map(cat => `
    <div class="category-chip ${AppState.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
      ${escapeHtml(cat)}
    </div>
  `).join('');

  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category;
      AppState.activeCategory = AppState.activeCategory === cat ? "" : cat;
      renderCategoryChips();
      renderMotorcyclesGrid();
    });
  });
}
// ==================== MOTORCYCLES MANAGEMENT ====================

function getFilteredMotorcycles() {
  let filtered = [...AppState.motorcycles];

  if (AppState.searchTerm) {
    const term = AppState.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (moto) =>
        moto.brand.toLowerCase().includes(term) ||
        moto.model.toLowerCase().includes(term) ||
        (moto.category && moto.category.toLowerCase().includes(term)),
    );
  }

  if (AppState.activeCategory) {
    filtered = filtered.filter(
      (moto) => moto.category === AppState.activeCategory,
    );
  }

  return filtered;
}

function getAllCategories() {
  const categories = new Set();
  AppState.motorcycles.forEach((moto) => {
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

  grid.innerHTML = filtered
    .map(
      (moto) => `
    <div class="moto-card ${AppState.selectedMotoId === moto.id ? "selected" : ""}" data-id="${moto.id}">
      <div class="moto-info">
        <div class="moto-brand">${escapeHtml(moto.brand)}</div>
        <div class="moto-model">${escapeHtml(moto.model)}</div>
        <div class="moto-category">${escapeHtml(moto.category || "—")}</div>
      </div>
      <div class="moto-badge">${moto.cc} cc</div>
    </div>
  `,
    )
    .join("");

  document.querySelectorAll(".moto-card").forEach((card) => {
    card.addEventListener("click", () => {
      const motoId = card.dataset.id;
      selectMotorcycle(motoId);
    });
  });
}

function selectMotorcycle(motoId) {
  AppState.selectedMotoId = motoId;
  const moto = AppState.motorcycles.find((m) => m.id === motoId);

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
}

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  const categories = getAllCategories();

  container.innerHTML = categories
    .map(
      (cat) => `
    <div class="category-chip ${AppState.activeCategory === cat ? "active" : ""}" data-category="${cat}">
      ${escapeHtml(cat)}
    </div>
  `,
    )
    .join("");

  document.querySelectorAll(".category-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cat = chip.dataset.category;
      AppState.activeCategory = AppState.activeCategory === cat ? "" : cat;
      renderCategoryChips();
      renderMotorcyclesGrid();
    });
  });
}

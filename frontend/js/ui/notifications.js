// ==================== NOTIFICHE (TOAST) ====================

function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon =
    {
      info: "fa-info-circle",
      success: "fa-check-circle",
      warning: "fa-exclamation-triangle",
      error: "fa-times-circle",
    }[type] || "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut .35s ease both";
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

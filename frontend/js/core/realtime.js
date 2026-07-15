// ==================== REALTIME (SOCKET.IO CLIENT) ====================

function initSocket() {
  AppState.socket = io();

  AppState.socket.on("connect", () => setSocketStatus("connected"));
  AppState.socket.on("disconnect", () => setSocketStatus("disconnected"));
  AppState.socket.on("connect_error", () => setSocketStatus("disconnected"));

  AppState.socket.on("slots_update", (data) => {
    AppState.bookedSlots = data.bookedSlots || {};
    refreshTimeSlotsUI();
  });

  AppState.socket.on("new_booking", (booking) => {
    const key = makeSlotKey(booking.date, booking.motorcycleId);
    if (!AppState.bookedSlots[key]) AppState.bookedSlots[key] = [];
    if (!AppState.bookedSlots[key].includes(booking.time)) {
      AppState.bookedSlots[key].push(booking.time);
    }
    refreshTimeSlotsUI();

    const currentDate = document.getElementById("date").value;
    const currentMoto = AppState.formData.motorcycleId;
    const userTime = AppState.formData.selectedTime;

    if (
      booking.date === currentDate &&
      booking.motorcycleId === currentMoto &&
      booking.time === userTime
    ) {
      showConflictMessage(booking);
    }
  });
}

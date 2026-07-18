// booking.js / booke.js

let socket = null;

const availableSlots = [
  "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM", "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM", "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"
];

let currentDate = new Date();
let selectedDateStr = "";
let selectedSlot = "";

// Initialize Calendar Components on Startup
document.addEventListener("DOMContentLoaded", () => {
  renderCalendar();
  
  if (window.io && CONFIG.SOCKET_URL) {
    socket = io(CONFIG.SOCKET_URL);
  }

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // 🔘 OK Button click logic bind - Modal close aur home page redirect routing
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      const successModal = document.getElementById('successModal');
      successModal.classList.add('hidden');
      window.location.href = "index.html"; // Home page path integration
    });
  }
});

// 📅 Generate Full Functional Dynamic Grid Calendar
function renderCalendar() {
  const gridContainer = document.getElementById('calendarDaysGrid');
  const monthYearLabel = document.getElementById('currentMonthYear');
  
  gridContainer.innerHTML = "";
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthYearLabel.innerText = `${monthNames[month]} ${year}`;
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement('div');
    gridContainer.appendChild(emptyDiv);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayBtn = document.createElement('button');
    dayBtn.type = "button";
    dayBtn.innerText = day;
    dayBtn.className = "cal-day";
    
    const targetDate = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (targetDate < today) {
      dayBtn.classList.add('day-past');
      dayBtn.disabled = true;
    } else {
      dayBtn.classList.add('day-available');
      
      if (targetDate.getTime() === today.getTime()) {
        dayBtn.classList.add('day-today');
      }
      
      if (dateStr === selectedDateStr) {
        dayBtn.classList.add('day-selected');
      }

      dayBtn.addEventListener('click', () => {
        document.querySelectorAll('.cal-day').forEach(b => b.classList.remove('day-selected'));
        dayBtn.classList.add('day-selected');
        selectedDateStr = dateStr;
        selectedSlot = "";
        updateDisplayDetails();
        fetchBookedSlotsForDate(dateStr);
      });
    }
    gridContainer.appendChild(dayBtn);
  }
}

// 🕒 Fetch Live Booked Slots Array from Backend API
async function fetchBookedSlotsForDate(dateString) {
  const container = document.getElementById('slotsContainer');
  container.innerHTML = `<p class="text-gold text-xs italic col-span-2">Checking availability...</p>`;
  
  try {
    const res = await fetch(`${CONFIG.BOOKED_SLOTS_URL}?date=${dateString}`);
    const data = await res.json();
    
    let bookedTimeStrings = [];
    if (data.bookedSlots && data.bookedSlots.length > 0) {
      if (typeof data.bookedSlots[0] === 'object') {
        bookedTimeStrings = data.bookedSlots.map(s => s.timeSlot);
      } else {
        bookedTimeStrings = data.bookedSlots;
      }
    }
    renderTimeSlotsUI(bookedTimeStrings);
  } catch (err) {
    container.innerHTML = `<p class="text-red-500 text-xs col-span-2">Error loading slots.</p>`;
  }
}

// ⚡ Render Time Block Options Array Map
function renderTimeSlotsUI(bookedSlots = []) {
  const container = document.getElementById('slotsContainer');
  container.innerHTML = "";

  availableSlots.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = "button";
    btn.innerText = slot;
    btn.className = "p-3 border text-xs text-center rounded transition border-zinc-700 hover:border-gold text-white";

    if (bookedSlots.includes(slot)) {
      btn.classList.add('slot-booked');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#slotsContainer button').forEach(b => {
          if (!b.disabled) b.className = "p-3 border text-xs text-center rounded transition border-zinc-700 hover:border-gold text-white";
        });
        btn.className = "p-3 border text-xs text-center rounded bg-gold-gradient text-black font-bold border-transparent";
        selectedSlot = slot;
        updateDisplayDetails();
      });
    }
    container.appendChild(btn);
  });
}

function updateDisplayDetails() {
  const inputDisplay = document.getElementById('displaySelectedDetails');
  if (selectedDateStr) {
    inputDisplay.value = `${selectedDateStr} @ ${selectedSlot ? selectedSlot : 'Select Time'}`;
  } else {
    inputDisplay.value = "No date selected yet";
  }
}

// 📤 Handle Submission Processing Flow
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedDateStr || !selectedSlot) {
    alert("Please choose both Date and Time Slot from calendar view components!");
    return;
  }

  const payload = {
    name: document.getElementById('userName').value,
    phone: document.getElementById('userPhone').value,
    email: document.getElementById('userEmail').value,
    service: document.getElementById('userService').value,
    date: selectedDateStr,
    timeSlot: selectedSlot
  };

  try {
    const response = await fetch(`${CONFIG.BOOK_NOW_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    if (resData.success) {
      // 🚨 UPDATED: Purana alert aur reload hatakar custom confirmation modal trigger kar rahe hain
      const successModal = document.getElementById('successModal');
      if (successModal) {
        successModal.classList.remove('hidden');
      }
      document.getElementById('bookingForm').reset();
    } else {
      alert(`Error: ${resData.message}`);
    }
  } catch (error) {
    alert("Server synchronization failure occurred.");
  }
});

// 📡 Real-time Socket Listener pipeline configuration
if (socket) {
  socket.on('appointmentBooked', (data) => {
    const toast = document.getElementById('notificationToast');
    document.getElementById('toastMessage').innerText = data.message;
    toast.classList.remove('hidden');
    
    if (data.data && selectedDateStr === data.data.date) {
      fetchBookedSlotsForDate(selectedDateStr);
    }

    setTimeout(() => { toast.classList.add('hidden'); }, 5000);
  });
}
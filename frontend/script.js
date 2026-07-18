// Ensure configurations are available before initializing logic
const API_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : '/api/appointments';
const SOCKET_URL = window.CONFIG ? window.CONFIG.SOCKET_URL : (window.location.origin || 'http://localhost:5000');

// Global State Management
const availableSlots = [
  "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM", "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM", "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"
];

let selectedDateStr = ""; 
let selectedSlot = "";
let currentNavDate = new Date(); // Browser month tracking block
let socket = null;

document.addEventListener("DOMContentLoaded", () => {
  const daysGrid = document.getElementById('calendarDaysGrid');
  
  if (!daysGrid) return; // Exit logic if not on the appointment page

  // Initialize Socket.io client safely
  if (window.io && SOCKET_URL) {
    socket = io(SOCKET_URL);
  }

  // Navigation Click Handlers
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentNavDate.setMonth(currentNavDate.getMonth() - 1);
    generateCalendar(currentNavDate);
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentNavDate.setMonth(currentNavDate.getMonth() + 1);
    generateCalendar(currentNavDate);
  });

  // Render Grid-based Day Blocks
  function generateCalendar(dateObject) {
    daysGrid.innerHTML = "";
    
    const year = dateObject.getFullYear();
    const month = dateObject.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('calendarMonthYear').innerText = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Padding cells for grid offset matching
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement('div');
      daysGrid.appendChild(emptyDiv);
    }

    // Days Render Cycle
    for (let day = 1; day <= totalDays; day++) {
      const dayBtn = document.createElement('button');
      dayBtn.type = "button";
      dayBtn.innerText = day;
      dayBtn.className = "w-9 h-9 mx-auto flex items-center justify-center text-xs font-medium rounded transition border border-transparent text-zinc-300 hover:border-gold/50";

      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cellDateObj = new Date(year, month, day);

      if (cellDateObj < today) {
        dayBtn.className = "w-9 h-9 mx-auto flex items-center justify-center text-xs text-zinc-600 opacity-30 cursor-not-allowed line-through";
        dayBtn.disabled = true;
      } else {
        if (cellDateObj.toDateString() === today.toDateString()) {
          dayBtn.classList.add('border-gold', 'text-gold');
        }
        
        if (cellDateStr === selectedDateStr) {
          dayBtn.className = "w-9 h-9 mx-auto flex items-center justify-center text-xs font-bold rounded bg-gold-gradient text-black shadow-lg";
        }

        dayBtn.addEventListener('click', () => {
          selectedDateStr = cellDateStr;
          generateCalendar(currentNavDate); // Refresh active styling states
          
          document.getElementById('displaySelectedDate').value = cellDateStr;
          document.getElementById('selectedDateLabel').innerText = `Active Date: ${cellDateStr}`;
          
          fetchSlotsForDate(cellDateStr);
        });
      }
      daysGrid.appendChild(dayBtn);
    }
  }

  // Fetch Async booked records from Backend API
  async function fetchSlotsForDate(dateString) {
    try {
      const res = await fetch(`${API_URL}/booked-slots?date=${dateString}`);
      const data = await res.json();
      
      const slotsContainer = document.getElementById('slotsContainer');
      slotsContainer.classList.remove('opacity-50', 'pointer-events-none');
      renderSlots(data.bookedSlots);
    } catch (err) {
      console.error("Fetch handling failure:", err);
    }
  }

  // Render Time Blocks Layout
  function renderSlots(bookedSlots = []) {
    const container = document.getElementById('slotsContainer');
    container.innerHTML = "";
    selectedSlot = "";

    availableSlots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = "button";
      btn.innerText = slot;
      btn.className = "p-3 border text-xs text-center rounded transition border-zinc-800 hover:border-gold bg-zinc-900/40 text-zinc-300";

      if (bookedSlots.includes(slot)) {
        btn.className = "p-3 border text-xs text-center rounded bg-red-900/20 border-red-900/40 text-red-400 opacity-40 cursor-not-allowed line-through";
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#slotsContainer button').forEach(b => {
            if (!b.disabled) b.className = "p-3 border text-xs text-center rounded transition border-zinc-800 hover:border-gold bg-zinc-900/40 text-zinc-300";
          });
          btn.className = "p-3 border text-xs text-center rounded bg-gold-gradient text-black font-bold border-transparent shadow-md";
          selectedSlot = slot;
        });
      }
      container.appendChild(btn);
    });
  }

  // Register Form Submission Request
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedDateStr || !selectedSlot) {
      alert("Please select both a Date from Calendar and a Time Slot!");
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
      const response = await fetch(`${API_URL}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        alert(`Success: ${resData.message}`);
        window.location.reload();
      } else {
        alert(`Booking Error: ${resData.message}`);
      }
    } catch (error) {
      console.error("Submit transaction failure:", error);
    }
  });

  // Handle Real-time Broadcast push logic
  if (socket) {
    socket.on('appointmentBooked', (data) => {
      const toast = document.getElementById('notificationToast');
      const msg = document.getElementById('toastMessage');
      
      if (toast && msg) {
        msg.innerText = data.message;
        toast.classList.remove('hidden');

        if (selectedDateStr === data.data.date) {
          fetchSlotsForDate(selectedDateStr);
        }
        setTimeout(() => { toast.classList.add('hidden'); }, 5000);
      }
    });
  }

  // Run calendar generation on document boot setup
  generateCalendar(currentNavDate);
});
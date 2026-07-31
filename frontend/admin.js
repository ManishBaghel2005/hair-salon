// admin.js

let socket = null;
let allAppointments = [];

document.addEventListener("DOMContentLoaded", () => {
  if (window.io && CONFIG.SOCKET_URL) {
    socket = io(CONFIG.SOCKET_URL);
  }

  // Token authentication check (Just in case directly access karne ki koshish kare)
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  fetchAllAppointments();

  // Attach Event Listeners for Filters
  document.getElementById('filterDate').addEventListener('change', () => {
    applyFilters();
  });

  document.getElementById('searchInput').addEventListener('input', () => {
    applyFilters();
  });

  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = "";
    document.getElementById('searchInput').value = "";
    window.activeQuickFilter = null;
    updateFilterButtonUI();
    applyFilters();
  });

  // 🚪 ✅ ADDED: Logout Click Event Handler Linker
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('adminToken'); // Token clear from memory
    window.location.href = 'login.html';   // Redirect to login terminal
  });

  // Setup Quick Filter Buttons
  ['Total', 'Today', 'Upcoming', 'Previous'].forEach(type => {
    const btn = document.getElementById(`filter${type}Btn`);
    if (btn) {
      btn.addEventListener('click', () => {
        window.activeQuickFilter = window.activeQuickFilter === type.toLowerCase() ? null : type.toLowerCase();
        updateFilterButtonUI();
        applyFilters();
      });
    }
  });
});

function updateFilterButtonUI() {
  ['Total', 'Today', 'Upcoming', 'Previous'].forEach(type => {
    const btn = document.getElementById(`filter${type}Btn`);
    if (btn) {
      if (window.activeQuickFilter === type.toLowerCase()) {
        btn.classList.add('border-theme-gold');
        btn.classList.remove('border-zinc-800');
        btn.querySelector('p').classList.add('text-theme-gold');
      } else {
        btn.classList.remove('border-theme-gold');
        btn.classList.add('border-zinc-800');
        btn.querySelector('p').classList.remove('text-theme-gold');
      }
    }
  });
}

function parseAppDates(app) {
  const dateParts = app.date.split('-');
  const y = parseInt(dateParts[0], 10);
  const m = parseInt(dateParts[1], 10) - 1;
  const d = parseInt(dateParts[2], 10);

  let startH = 0, startM = 0;
  let endH = 0, endM = 0;
  
  if (app.timeSlot) {
    const parts = app.timeSlot.split('-');
    const parseTime = (str) => {
      const p = str.trim().split(' ');
      if(p.length !== 2) return [0,0];
      let [h, min] = p[0].split(':').map(Number);
      if (p[1].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (p[1].toUpperCase() === 'AM' && h === 12) h = 0;
      return [h, min];
    };
    [startH, startM] = parseTime(parts[0]);
    if(parts.length > 1) {
      [endH, endM] = parseTime(parts[1]);
    } else {
      endH = startH; endM = startM;
    }
  }
  return {
    start: new Date(y, m, d, startH, startM),
    end: new Date(y, m, d, endH, endM)
  };
}

// 🌐 Rest API Pipeline to pull down historical ledger logs
async function fetchAllAppointments() {
  const tableStatus = document.getElementById('tableStatus');
  const token = localStorage.getItem('adminToken');

  try {
    // ✅ ADDED: Headers me Bearer Token inject kiya secure verification ke liye
    const response = await fetch(`${CONFIG.FETCH_ALL_URL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }); 

    // Agar token invalid ho chuka ho ya expire ho gaya ho (401/403 Status)
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = 'login.html';
      return;
    }

    const resData = await response.json();
    
    allAppointments = resData.data || resData.appointments || resData || [];
    
    tableStatus.innerText = "System Sync Synchronized";
    applyFilters(); 
  } catch (error) {
    console.error("Failed fetching ledger data:", error);
    tableStatus.innerText = "Connection Dropped";
  }
}

// 🎛️ Dynamic Memory Filter Logic Engine
function applyFilters() {
  let filteredList = allAppointments;

  const dateFilterValue = document.getElementById('filterDate').value;
  const searchFilterValue = document.getElementById('searchInput').value.toLowerCase();

  if (dateFilterValue) {
    filteredList = filteredList.filter(app => app.date === dateFilterValue);
  }

  if (searchFilterValue) {
    filteredList = filteredList.filter(app => {
      const name = (app.name || "").toLowerCase();
      const phone = (app.phone || "").toLowerCase();
      const email = (app.email || "").toLowerCase();
      return name.includes(searchFilterValue) || phone.includes(searchFilterValue) || email.includes(searchFilterValue);
    });
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Apply Quick Filters
  if (window.activeQuickFilter && window.activeQuickFilter !== 'total') {
    filteredList = filteredList.filter(app => {
      const dates = parseAppDates(app);
      if (window.activeQuickFilter === 'previous') {
        return dates.end < now;
      } else if (window.activeQuickFilter === 'today') {
        return dates.end >= now && app.date === todayStr;
      } else if (window.activeQuickFilter === 'upcoming') {
        return dates.end >= now && app.date > todayStr;
      }
      return true;
    });
  }

  // Sort list logically
  filteredList.sort((a, b) => {
    const datesA = parseAppDates(a);
    const datesB = parseAppDates(b);
    
    if (window.activeQuickFilter === 'previous') {
      return datesB.start - datesA.start; // Descending (Closest past first)
    } else if (window.activeQuickFilter === 'upcoming' || window.activeQuickFilter === 'today') {
      return datesA.start - datesB.start; // Ascending (Closest future first)
    } else {
      return datesB.start - datesA.start; // Total: Descending by default
    }
  });

  renderTableRows(filteredList);
  calculateMetrics(allAppointments);
}

// 🔲 Data UI Rendering Engine
function renderTableRows(dataList) {
  const tbody = document.getElementById('adminTableBody');
  const emptyState = document.getElementById('emptyState');
  
  tbody.innerHTML = "";

  if (dataList.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  let currentMonthStr = "";

  dataList.forEach(app => {
    // Generate Month Header
    if (app.date) {
      const dateParts = app.date.split('-');
      const d = new Date(dateParts[0], parseInt(dateParts[1]) - 1, dateParts[2]);
      const monthStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (monthStr !== currentMonthStr) {
        currentMonthStr = monthStr;
        const monthRow = document.createElement('tr');
        monthRow.className = "bg-zinc-950 border-b border-theme-gold/20";
        monthRow.innerHTML = `<td colspan="6" class="p-3 text-center text-theme-gold font-bold uppercase tracking-widest text-xs">${monthStr}</td>`;
        tbody.appendChild(monthRow);
      }
    }

    const row = document.createElement('tr');
    row.className = "hover:bg-zinc-900/40 transition duration-150 border-b border-zinc-900";
    
    row.innerHTML = `
      <td class="p-4 font-bold text-white">${app.name}</td>
      <td class="p-4">
        <div class="text-zinc-300">${app.email || 'No Email'}</div>
        <div class="text-xs text-zinc-500">${app.phone}</div>
      </td>
      <td class="p-4"><span class="border border-zinc-800 bg-zinc-900 px-2 py-1 rounded text-xs text-gold">${app.service}</span></td>
      <td class="p-4 text-zinc-300 font-medium">${app.date}</td>
      <td class="p-4 text-zinc-400">${app.timeSlot}</td>
      <td class="p-4 text-right"><span class="text-green-400 bg-green-950/30 text-xs px-2 py-0.5 rounded border border-green-900/50">Confirmed</span></td>
    `;
    
    tbody.appendChild(row);
  });
}

// 📊 Live Matrix Calculator Engines
function calculateMetrics(masterList) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  let totalCount = masterList.length;
  let todayCount = 0;
  let upcomingCount = 0;
  let previousCount = 0;

  masterList.forEach(app => {
    const dates = parseAppDates(app);
    if (dates.end < now) {
      previousCount++;
    } else if (app.date === todayStr) {
      todayCount++;
    } else if (app.date > todayStr) {
      upcomingCount++;
    }
  });

  const elTotal = document.getElementById('statTotal');
  const elToday = document.getElementById('statToday');
  const elUpcoming = document.getElementById('statUpcoming');
  const elPrevious = document.getElementById('statPrevious');

  if (elTotal) elTotal.innerText = totalCount;
  if (elToday) elToday.innerText = todayCount;
  if (elUpcoming) elUpcoming.innerText = upcomingCount;
  if (elPrevious) elPrevious.innerText = previousCount;
}

// 📡 Real-time Node WebSocket Handler pipeline interceptor
if (socket) {
  socket.on('appointmentBooked', (incomingData) => {
    const appData = incomingData.data || incomingData; 
    
    if (!appData || !appData._id) return;

    const existingIndex = allAppointments.findIndex(a => a._id === appData._id);
    
    if (existingIndex === -1) {
      allAppointments.push(appData);
      
      const currentActiveFilter = document.getElementById('filterDate').value;
      applyFilters(currentActiveFilter);
      
      document.getElementById('tableStatus').innerText = `New Entry Detected: ${appData.name}!`;
      setTimeout(() => { document.getElementById('tableStatus').innerText = "System Sync Synchronized"; }, 4000);
    }
  });
}
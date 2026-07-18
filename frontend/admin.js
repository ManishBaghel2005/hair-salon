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
  document.getElementById('filterDate').addEventListener('change', (e) => {
    applyFilters(e.target.value);
  });

  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = "";
    applyFilters("");
  });

  // 🚪 ✅ ADDED: Logout Click Event Handler Linker
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('adminToken'); // Token clear from memory
    window.location.href = 'login.html';   // Redirect to login terminal
  });
});

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
    applyFilters(""); 
  } catch (error) {
    console.error("Failed fetching ledger data:", error);
    tableStatus.innerText = "Connection Dropped";
  }
}

// 🎛️ Dynamic Memory Filter Logic Engine
function applyFilters(dateFilterValue) {
  let filteredList = allAppointments;

  if (dateFilterValue) {
    filteredList = allAppointments.filter(app => app.date === dateFilterValue);
  }

  // Sort list logically by Date and Time Slot
  filteredList.sort((a, b) => new Date(a.date) - new Date(b.date));

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

  dataList.forEach(app => {
    const row = document.createElement('tr');
    row.className = "hover:bg-zinc-900/40 transition duration-150 border-b border-zinc-900";
    
    row.innerHTML = `
      <td class="p-4 font-bold text-white">${app.name}</td>
      <td class="p-4">
        <div class="text-zinc-300">${app.email}</div>
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
  document.getElementById('statTotal').innerText = masterList.length;

  // ✅ Safe Local Timezone String (YYYY-MM-DD)
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const todaysCount = masterList.filter(app => app.date === todayStr).length;
  document.getElementById('statToday').innerText = todaysCount;
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
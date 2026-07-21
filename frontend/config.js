// config.js

// 🚨 YAHAN APNE RENDER/RAILWAY BACKEND KA LIVE URL DAALNA DEPLOYMENT KE BAAD
const BACKEND_LIVE_URL = 'https://hair-salon-1-37e6.onrender.com'; 

const DEFAULT_API_BASE_URL = `${BACKEND_LIVE_URL}/api/appointments`;
const DEFAULT_SOCKET_URL = BACKEND_LIVE_URL;

const CONFIG = {
    API_BASE_URL: window.__API_BASE_URL || DEFAULT_API_BASE_URL,
    SOCKET_URL: window.__SOCKET_URL || DEFAULT_SOCKET_URL,

    get FETCH_ALL_URL() { return `${this.API_BASE_URL}/all`; },
    get BOOK_NOW_URL() { return `${this.API_BASE_URL}/book`; },
    get BOOKED_SLOTS_URL() { return `${this.API_BASE_URL}/booked-slots`; },
    get LOGIN_URL() { return `${this.API_BASE_URL}/admin/login`; }
};

window.CONFIG = CONFIG;
window.API_URL = CONFIG.API_BASE_URL;
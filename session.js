/* =========================
   CONFIG
========================= */
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 min idle
const WARNING_TIME = 10 * 1000;         // warning 10 sec before logout
const CHECK_INTERVAL = 3000;

const channel = new BroadcastChannel("auth_channel");

/* =========================
   STATE
========================= */
let warningShown = false;
let sessionExpired = localStorage.getItem("sessionExpired") === "true";

let countdown = 10;
let countdownInterval = null;

let lastScrollTime = Date.now();
let lastMouseTime = Date.now();

/* =========================
   INIT SESSION
========================= */
if (localStorage.getItem("loggedIn") === "true" && !localStorage.getItem("lastActivity")) {
    localStorage.setItem("lastActivity", Date.now());
}

/* =========================
   CHECK LOGIN GUARD
========================= */
async function checkSession() {
    const loggedIn = localStorage.getItem("loggedIn");

    if (loggedIn !== "true") {
        clearAuthStates();
        window.location.replace("login.html");
        return false;
    }

    if (sessionExpired || localStorage.getItem("sessionExpired") === "true") {
        showExpiredModal();
        return false;
    }

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    if (idle > SESSION_TIMEOUT) {
        showExpiredModal();
        return false;
    }

    updateActivity();
    return true;
}

/* =========================
   ACTIVITY TRACKING (OPTIMIZED WITH THROTTLING)
========================= */
let activityTimeout = null;
function updateActivity() {
    if (sessionExpired || localStorage.getItem("sessionExpired") === "true") return;
    
    // Throttling: Jangan tulis ke localStorage setiap milisaat untuk jimat bateri telefon/PWA
    if (!activityTimeout) {
        localStorage.setItem("lastActivity", Date.now());
        activityTimeout = setTimeout(() => { activityTimeout = null; }, 1000);
    }
}

/* Mouse / keyboard activity with Performance Optimization */
["mousemove", "mousedown", "keydown", "touchstart"].forEach(event => {
    document.addEventListener(event, () => {
        lastMouseTime = Date.now();
        updateActivity();
    }, { passive: true }); // Menggunakan passive true supaya tatalan skrin telefon pintar tidak sangkut (Smooth Scrolling)
});

/* =========================
   SCROLL TRACKING (READING MODE)
========================= */
let scrollTimer = null;
window.addEventListener("scroll", () => {
    lastScrollTime = Date.now();
    updateActivity();

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        lastScrollTime = Date.now();
    }, 1500);
}, { passive: true });

/* =========================
   PWA & MULTI-TAB RESUME FIX
========================= */
function checkIdleOnResume() {
    if (localStorage.getItem("loggedIn") !== "true") return;
    
    // Semak state terkini terus dari storage (takut tab lain dah set expired)
    if (localStorage.getItem("sessionExpired") === "true") {
        showExpiredModal();
        return;
    }

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    if (idle >= SESSION_TIMEOUT) {
        showExpiredModal();
    } else {
        // Jika tab lain baru sahaja aktif, tutup warning modal jika sedang terbuka di tab ini
        if (idle < (SESSION_TIMEOUT - WARNING_TIME) && warningShown) {
            closeWarningModalLocal();
        }
    }
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkIdleOnResume();
});

window.addEventListener("focus", checkIdleOnResume);
window.addEventListener("pageshow", checkIdleOnResume);

// BUG FIX MULTI-TAB: Jika pengguna sambung aktiviti di Tab A, Tab B yang terbiar akan tahu secara automatik
window.addEventListener("storage", (e) => {
    if (e.key === "lastActivity") {
        checkIdleOnResume();
    }
    if (e.key === "sessionExpired" && e.newValue === "true") {
        showExpiredModal();
    }
});

/* =========================
   USER STATE
========================= */
function getUserState() {
    const now = Date.now();
    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idleTime = now - last;

    const recentScroll = now - lastScrollTime;
    const recentMouse = now - lastMouseTime;

    const isReading = recentScroll < 5000;

    return {
        idleTime,
        isReading,
        isActive: recentMouse < 5000 || recentScroll < 5000
    };
}

/* =========================
   EXPIRED MODAL
========================= */
function showExpiredModal() {
    sessionExpired = true;
    localStorage.setItem("sessionExpired", "true"); 

    // Tutup amaran amaran lama
    closeWarningModalLocal();

    if (document.getElementById("sessionExpiredModal")) return;

    const modal = document.createElement("div");
    modal.id = "sessionExpiredModal";
    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;backdrop-filter:blur(3px);">
        <div style="width:320px;background:white;border-radius:18px;padding:22px;text-align:center;font-family:system-ui;box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="color:#1d1d1f;margin-top:0;">Session Expired</h3>
            <p style="margin:12px 0 24px 0;color:#666;font-size:14px;line-height:1.4;">
                Your session has expired due to inactivity. Please log in again.
            </p>
            <button id="loginAgainBtn"
                style="width:100%;padding:12px;border:none;border-radius:12px;background:#007AFF;color:white;font-weight:700;cursor:pointer;font-size:15px;">
                Login Again
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    document.getElementById("loginAgainBtn").onclick = () => {
        forceLogout(true);
    };
}

/* =========================
   WARNING MODAL
========================= */
function showWarning() {
    if (warningShown || sessionExpired || localStorage.getItem("sessionExpired") === "true") return;
    warningShown = true;
    countdown = 10;

    if (countdownInterval) clearInterval(countdownInterval);
    if (document.getElementById("sessionWarningModal")) return;

    const modal = document.createElement("div");
    modal.id = "sessionWarningModal";
    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;backdrop-filter:blur(3px);">
        <div style="width:320px;background:white;border-radius:18px;padding:20px;text-align:center;font-family:system-ui;box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="color:#1d1d1f;margin-top:0;">Session Expiring</h3>
            <p style="margin:6px 0;color:#666;font-size:14px;">You have been inactive for a while.</p>
            <p style="font-weight:700;color:#FF3B30;margin-bottom:18px;font-size:16px;">
                Auto logout in <span id="cd">10</span>s
            </p>
            <button id="extendBtn"
                style="width:100%;padding:12px;background:#34C759;color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:15px;">
                Extend Session
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    const cd = modal.querySelector("#cd");

    countdownInterval = setInterval(() => {
        countdown--;
        if (cd) cd.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            modal.remove();
            showExpiredModal();
        }
    }, 1000);

    modal.querySelector("#extendBtn").onclick = () => {
        // Hubungi tab-tab lain untuk tutup warning modal secara serentak
        channel.postMessage({ type: "EXTEND_SESSION" });
        extendSessionLocal();
    };
}

// Fungsi pembantu untuk tutup/lanjutkan sesi secara lokal pada tab semasa
function extendSessionLocal() {
    if (countdownInterval) clearInterval(countdownInterval);
    const modal = document.getElementById("sessionWarningModal");
    if (modal) modal.remove();
    warningShown = false;
    updateActivity();
}

function closeWarningModalLocal() {
    if (countdownInterval) clearInterval(countdownInterval);
    const modal = document.getElementById("sessionWarningModal");
    if (modal) modal.remove();
    warningShown = false;
}

/* =========================
   CLEAR AUTH STATES HELPERS
========================= */
function clearAuthStates() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("sessionExpired");
}

/* =========================
   FORCE LOGOUT
========================= */
function forceLogout(broadcast = true) {
    clearAuthStates();

    if (broadcast) {
        channel.postMessage({ type: "LOGOUT" });
    }

    window.location.replace("login.html");
}

/* =========================
   BROADCAST CHANNEL LISTENERS
========================= */
channel.onmessage = (e) => {
    if (e.data.type === "LOGOUT") {
        forceLogout(false);
    }
    // BUG FIX: Jika pengguna klik 'Extend' di tab sebelah, tab ini pun akan bersihkan modal amaran
    if (e.data.type === "EXTEND_SESSION") {
        extendSessionLocal();
    }
};

/* =========================
   MAIN ENGINE LOOP
========================= */
setInterval(() => {
    if (sessionExpired || localStorage.getItem("sessionExpired") === "true" || localStorage.getItem("loggedIn") !== "true") return;

    const state = getUserState();
    const idle = state.idleTime;

    // Warning sebelum timeout
    if (!state.isReading && idle > (SESSION_TIMEOUT - WARNING_TIME) && !warningShown) {
        showWarning();
    }

    // Expired
    if (!state.isReading && idle > SESSION_TIMEOUT) {
        showExpiredModal();
    }
}, CHECK_INTERVAL);

// Jalankan semakan keselamatan sebaik fail ini dimuat turun
checkSession();
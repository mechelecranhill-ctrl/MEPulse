/* =========================
   CONFIG
========================= */
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 min idle
const WARNING_TIME = 10 * 1000;         // warning 10 sec before logout
const CHECK_INTERVAL = 3000;

// Generate a unique ID for this specific tab instance upon load/refresh
const TAB_ID = String(Math.random() + Date.now()); 
const channel = new BroadcastChannel("auth_channel");

/* =========================
   STATE
========================= */
let warningShown = false;
let sessionExpired = localStorage.getItem("sessionExpired") === "true";

let countdown = 10;
let countdownInterval = null;

/* =========================
   INIT & UPDATE SESSION STATE
========================= */
if (localStorage.getItem("loggedIn") === "true") {
    // The newest opened tab registers its TAB_ID as the active session owner
    if (!localStorage.getItem("activeTabId")) {
        localStorage.setItem("activeTabId", TAB_ID);
    }
    if (!localStorage.getItem("lastActivity")) {
        localStorage.setItem("lastActivity", Date.now());
    }
}

/* =========================
   CHECK LOGIN GUARD
========================= */
async function checkSession() {
    const loggedIn = localStorage.getItem("loggedIn");

    // 1. Guard against unauthenticated access
    if (loggedIn !== "true") {
        clearAuthStates();
        window.location.replace("login.html");
        return false;
    }

    // 2. Multi-tab conflict guard: If another tab is opened, this tab is kicked out instantly
    const currentActiveTab = localStorage.getItem("activeTabId");
    if (currentActiveTab && currentActiveTab !== TAB_ID) {
        showKickedModal();
        return false;
    }

    // 3. Guard against expired session state
    if (sessionExpired || localStorage.getItem("sessionExpired") === "true") {
        showExpiredModal();
        return false;
    }

    // 4. Inactivity idle check
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
   ACTIVITY TRACKING (WITH THROTTLING)
========================= */
let activityTimeout = null;
function updateActivity(force = false) {
    if (sessionExpired || localStorage.getItem("sessionExpired") === "true") return;
    
    // Ensure this tab is still the legitimate active session owner before updating activity
    if (localStorage.getItem("activeTabId") !== TAB_ID) return;

    if (force) {
        localStorage.setItem("lastActivity", Date.now());
        return;
    }

    if (!activityTimeout) {
        localStorage.setItem("lastActivity", Date.now());
        activityTimeout = setTimeout(() => { activityTimeout = null; }, 1000);
    }
}

/* Mouse / keyboard / touch listeners */
["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach(event => {
    document.addEventListener(event, () => {
        updateActivity();
    }, { passive: true });
});

/* =========================
   STORAGE MONITOR (CROSS-TAB SYNC)
========================= */
window.addEventListener("storage", (e) => {
    // If a background/new tab takes over the activeTabId ownership
    if (e.key === "activeTabId" && e.newValue !== TAB_ID) {
        showKickedModal();
    }
    if (e.key === "sessionExpired" && e.newValue === "true") {
        showExpiredModal();
    }
});

/* =========================
   MODAL UTILITY HELPERS
========================= */
function clearWarningModal() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    const modal = document.getElementById("sessionWarningModal");
    if (modal) modal.remove();
    warningShown = false;
}

/* =========================
   KICKED MODAL (SINGLE SESSION ENFORCEMENT)
========================= */
function showKickedModal() {
    sessionExpired = true;
    clearWarningModal();

    if (document.getElementById("sessionKickedModal")) return;

    const modal = document.createElement("div");
    modal.id = "sessionKickedModal";
    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;justify-content:center;align-items:center;z-index:999999;backdrop-filter:blur(4px);">
        <div style="width:320px;background:white;border-radius:18px;padding:22px;text-align:center;font-family:system-ui;box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="color:#FF3B30;margin-top:0;">Session Conflicted</h3>
            <p style="margin:12px 0 24px 0;color:#666;font-size:14px;line-height:1.4;">
                Your account has been logged in on another device or tab. Please log in again if this was a mistake.
            </p>
            <button id="kickBtn"
                style="width:100%;padding:12px;border:none;border-radius:12px;background:#FF3B30;color:white;font-weight:700;cursor:pointer;font-size:15px;transition: all 0.2s ease;outline:none;"
                onmousedown="this.style.transform='scale(0.96)';this.style.background='#d9231a';"
                onmouseup="this.style.transform='scale(1)';this.style.background='#FF3B30';"
                onmouseleave="this.style.transform='scale(1)';this.style.background='#FF3B30';"
                ontouchstart="this.style.transform='scale(0.96)';this.style.background='#d9231a';"
                ontouchend="this.style.transform='scale(1)';this.style.background='#FF3B30';">
                Ok, Got it
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);
    document.getElementById("kickBtn").onclick = () => {
        forceLogout(true);
    };
}

/* =========================
   EXPIRED MODAL
========================= */
function showExpiredModal() {
    sessionExpired = true;
    localStorage.setItem("sessionExpired", "true"); 
    clearWarningModal();

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
                style="width:100%;padding:12px;border:none;border-radius:12px;background:#007AFF;color:white;font-weight:700;cursor:pointer;font-size:15px;transition: all 0.2s ease;outline:none;"
                onmousedown="this.style.transform='scale(0.96)';this.style.background='#0062cc';"
                onmouseup="this.style.transform='scale(1)';this.style.background='#007AFF';"
                onmouseleave="this.style.transform='scale(1)';this.style.background='#007AFF';"
                ontouchstart="this.style.transform='scale(0.96)';this.style.background='#0062cc';"
                ontouchend="this.style.transform='scale(1)';this.style.background='#007AFF';">
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
    
    // Halt warning triggers if this tab instance lost active ownership status
    if (localStorage.getItem("activeTabId") !== TAB_ID) return;

    warningShown = true;
    countdown = 10;

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
                style="width:100%;padding:12px;background:#34C759;color:white;border:none;font-weight:700;border-radius:12px;cursor:pointer;font-size:15px;transition: all 0.2s ease;outline:none;"
                onmousedown="this.style.transform='scale(0.96)';this.style.background='#28a745';"
                onmouseup="this.style.transform='scale(1)';this.style.background='#34C759';"
                onmouseleave="this.style.transform='scale(1)';this.style.background='#34C759';"
                ontouchstart="this.style.transform='scale(0.96)';this.style.background='#28a745';"
                ontouchend="this.style.transform='scale(1)';this.style.background='#34C759';">
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
            channel.postMessage({ type: "SESSION_EXPIRED" });
        }
    }, 1000);

    modal.querySelector("#extendBtn").onclick = () => {
        updateActivity(true);
        clearWarningModal();
    };
}

/* =========================
   CLEAR AUTH STATES HELPERS
========================= */
function clearAuthStates() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("sessionExpired");
    localStorage.removeItem("activeTabId");
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
    if (e.data.type === "SESSION_EXPIRED") {
        showExpiredModal();
    }
};

/* =========================
   MAIN ENGINE LOOP
========================= */
setInterval(() => {
    if (
        sessionExpired || 
        localStorage.getItem("sessionExpired") === "true" || 
        localStorage.getItem("loggedIn") !== "true"
    ) {
        return;
    }

    // Intercept checking loop if another tab took over the active session
    if (localStorage.getItem("activeTabId") !== TAB_ID) {
        showKickedModal();
        return;
    }

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    if (idle > (SESSION_TIMEOUT - WARNING_TIME) && !warningShown) {
        showWarning();
    }

    if (idle > SESSION_TIMEOUT) {
        showExpiredModal();
    }
}, CHECK_INTERVAL);

// Run initialization routine as soon as script loads
checkSession();

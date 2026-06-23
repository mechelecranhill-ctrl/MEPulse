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
let sessionExpired = false;

let countdown = 10;
let countdownInterval = null;

let lastScrollTime = Date.now();
let lastMouseTime = Date.now();

/* =========================
   INIT SESSION
========================= */
if (!localStorage.getItem("lastActivity")) {
    localStorage.setItem("lastActivity", Date.now());
}

/* =========================
   CHECK LOGIN GUARD
========================= */
async function checkSession() {

    const loggedIn = localStorage.getItem("loggedIn");

    if (loggedIn !== "true") {
        window.location.replace("login.html");
        return false;
    }

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    if (idle > SESSION_TIMEOUT) {
        localStorage.clear();
        window.location.replace("login.html");
        return false;
    }

    return true;
}

/* =========================
   ACTIVITY TRACKING
========================= */
function updateActivity() {

    if (sessionExpired) return;

    localStorage.setItem("lastActivity", Date.now());
    warningShown = false;
}

/* Mouse / keyboard activity */
["mousemove", "mousedown", "keydown", "touchstart"].forEach(event => {
    document.addEventListener(event, () => {
        lastMouseTime = Date.now();
        updateActivity();
    }, true);
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
   PWA RESUME FIX
========================= */
function checkIdleOnResume() {

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    if (idle >= SESSION_TIMEOUT) {
        showExpiredModal();
    } else {
        updateActivity();
    }
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkIdleOnResume();
});

window.addEventListener("focus", checkIdleOnResume);
window.addEventListener("pageshow", checkIdleOnResume);

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

    if (sessionExpired) return;
    sessionExpired = true;

    if (document.getElementById("sessionExpiredModal")) return;

    const modal = document.createElement("div");
    modal.id = "sessionExpiredModal";

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;">
        <div style="width:320px;background:white;border-radius:18px;padding:22px;text-align:center;font-family:system-ui;">
            <h3>Session Expired</h3>
            <p style="margin:12px 0;color:#666;">
                Your session has expired due to inactivity.
            </p>
            <button id="loginAgainBtn"
                style="width:100%;padding:12px;border:none;border-radius:12px;background:#007AFF;color:white;font-weight:700;">
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

    if (warningShown) return;

    warningShown = true;
    countdown = 10;

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    const modal = document.createElement("div");

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;">
        <div style="width:320px;background:white;border-radius:18px;padding:20px;text-align:center;font-family:system-ui;">
            <h3>Session Expiring</h3>
            <p>You are inactive</p>
            <p style="font-weight:700;color:#007AFF;">
                Auto logout in <span id="cd">10</span>s
            </p>
            <button id="extendBtn"
                style="width:100%;margin-top:10px;padding:12px;background:#34C759;color:white;border:none;font-weight:700;border-radius:12px;">
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

        clearInterval(countdownInterval);
        modal.remove();

        warningShown = false;
        updateActivity();
    };
}

/* =========================
   FORCE LOGOUT
========================= */
function forceLogout(broadcast = true) {

    localStorage.clear();

    if (broadcast) {
        channel.postMessage({ type: "LOGOUT" });
    }

    window.location.replace("login.html");
}

channel.onmessage = (e) => {
    if (e.data.type === "LOGOUT") {
        forceLogout(false);
    }
};

/* =========================
   MAIN ENGINE LOOP
========================= */
setInterval(() => {

    if (sessionExpired) return;

    const state = getUserState();
    const idle = state.idleTime;

    // warning before timeout
    if (!state.isReading &&
        idle > SESSION_TIMEOUT - WARNING_TIME &&
        !warningShown) {
        showWarning();
    }

    // expired
    if (!state.isReading &&
        idle > SESSION_TIMEOUT) {
        showExpiredModal();
    }

}, CHECK_INTERVAL);
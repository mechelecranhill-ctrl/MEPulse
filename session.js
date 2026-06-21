const SESSION_TIMEOUT = 15 * 60 * 1000;
const WARNING_TIME = 10 * 1000;
const CHECK_INTERVAL = 3000;

const channel = new BroadcastChannel("auth_channel");

let warningShown = false;
let expired = false;
let countdown = 10;
let countdownInterval;

let lastScrollTime = Date.now();
let lastMouseTime = Date.now();

/* =========================
   ACTIVITY TRACKING
========================= */
function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());

    warningShown = false;
}

/* mouse/keyboard activity */
["mousemove","mousedown","keydown","touchstart"]
.forEach(e => {
    document.addEventListener(e, () => {
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

    // detect reading mode (scrolling continuously)
    clearTimeout(scrollTimer);

    scrollTimer = setTimeout(() => {
        // user stopped scrolling → still reading, NOT idle
        lastScrollTime = Date.now();
    }, 1500);

}, { passive: true });

/* =========================
   FORCE LOGOUT (SYNC ALL TABS)
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
   SUPABASE REFRESH
========================= */
async function refreshSupabaseSession() {
    try {
        const session = JSON.parse(localStorage.getItem("sb-session"));
        if (!session?.refresh_token) return false;

        const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: "POST",
            headers: {
                apikey: SB_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                refresh_token: session.refresh_token
            })
        });

        const data = await res.json();

        if (data?.access_token) {
            localStorage.setItem("sb-session", JSON.stringify(data));
            return true;
        }

        return false;

    } catch (e) {
        return false;
    }
}

/* =========================
   SMART IDLE DETECTION
========================= */
function getUserState() {

    const now = Date.now();

    const lastActivity = Number(localStorage.getItem("lastActivity")) || 0;

    const idleTime = now - lastActivity;

    const recentScroll = now - lastScrollTime;
    const recentMouse = now - lastMouseTime;

    const isReading =
        recentScroll < 5000; // user still reading/scrolling

    const isActive =
        recentMouse < 5000 || recentScroll < 5000;

    return {
        idleTime,
        isReading,
        isActive
    };
}

/* =========================
   WARNING MODAL
========================= */
function showWarning() {

    if (warningShown) return;
    warningShown = true;

    const modal = document.createElement("div");

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;">
        <div style="width:320px;background:white;border-radius:18px;text-align:center;font-family:system-ui;padding:20px;">
            <h3>Session Expiring</h3>
            <p>You are inactive</p>
            <p style="font-weight:700;color:#007AFF">
                Auto logout in <span id="cd">${countdown}</span>s
            </p>

            <button id="extendBtn" style="width:100%;margin-top:10px;padding:12px;background:#34C759;color:white;border:none;font-weight:700;">
                Extend Session
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    const cd = document.getElementById("cd");

    countdownInterval = setInterval(() => {

        countdown--;

        if (cd) cd.textContent = countdown;

        if (countdown <= 0) {
            forceLogout(true);
        }

    }, 1000);

    document.getElementById("extendBtn").onclick = async () => {

        const ok = await refreshSupabaseSession();

        if (ok) {
            updateActivity();
            warningShown = false;
            expired = false;
            countdown = 10;
            modal.remove();
            clearInterval(countdownInterval);
        } else {
            forceLogout(true);
        }
    };
}

/* =========================
   MAIN LOOP (SMART ENGINE)
========================= */
setInterval(async () => {

    const state = getUserState();

    const idle = state.idleTime;

    // ❌ DO NOT TRIGGER WARNING if reading
    if (!state.isReading && idle > SESSION_TIMEOUT - WARNING_TIME && !warningShown) {
        showWarning();
    }

    // ❌ EXPIRE ONLY IF TRUE IDLE
    if (!state.isReading && idle > SESSION_TIMEOUT) {

        const refreshed = await refreshSupabaseSession();

        if (refreshed) {
            updateActivity();
            warningShown = false;
            return;
        }

        forceLogout(true);
    }

}, CHECK_INTERVAL);
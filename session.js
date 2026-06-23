const SESSION_TIMEOUT = 15 * 60 * 1000;
const WARNING_TIME = 10 * 1000;
const CHECK_INTERVAL = 3000;

if (!localStorage.getItem("lastActivity")) {
    localStorage.setItem("lastActivity", Date.now());
}

const channel = new BroadcastChannel("auth_channel");

let warningShown = false;
let countdown = 10;
let countdownInterval = null;

let lastScrollTime = Date.now();
let lastMouseTime = Date.now();

/* =========================
   ACTIVITY TRACKING
========================= */
function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
    warningShown = false;
}

/* input activity */
["mousemove","mousedown","keydown","touchstart"].forEach(e => {
    document.addEventListener(e, () => {
        lastMouseTime = Date.now();
        updateActivity();
    }, true);
});

/* =========================
   PWA RESUME FIX
========================= */
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateActivity();
});

window.addEventListener("focus", updateActivity);
window.addEventListener("pageshow", updateActivity);
window.addEventListener("online", updateActivity);

/* =========================
   SCROLL TRACKING
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
   FORCE LOGOUT
========================= */
function forceLogout(broadcast = true) {

    localStorage.removeItem("sb-session");
    localStorage.removeItem("lastActivity");

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

    } catch (err) {
        return false;
    }
}

/* =========================
   STATE ENGINE
========================= */
function getUserState() {

    const now = Date.now();

    const last = Number(localStorage.getItem("lastActivity")) || Date.now();

    const idleTime = now - last;

    const isReading =
        (now - lastScrollTime < 5000);

    return {
        idleTime,
        isReading,
        shouldWarn: idleTime >= (SESSION_TIMEOUT - WARNING_TIME),
        isExpired: idleTime >= SESSION_TIMEOUT
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
        countdownInterval = null;
    }

    const modal = document.createElement("div");

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.6);
    display:flex;align-items:center;justify-content:center;z-index:999999;">
    
    <div style="background:#fff;padding:20px;border-radius:16px;width:320px;text-align:center;">
        <h3>Session Expiring</h3>
        <p>Auto logout in <b id="cd">${countdown}</b>s</p>
        <button id="extendBtn">Extend Session</button>
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
            modal.remove();
            clearInterval(countdownInterval);
        } else {
            forceLogout(true);
        }
    };
}

/* =========================
   MAIN LOOP
========================= */
setInterval(async () => {

    const state = getUserState();

    if (state.shouldWarn && !warningShown) {
        showWarning();
    }

    if (state.isExpired) {

        const refreshed = await refreshSupabaseSession();

        if (refreshed) {
            updateActivity();
            warningShown = false;
            return;
        }

        forceLogout(true);
    }

}, CHECK_INTERVAL);
const SESSION_TIMEOUT = 20 * 1000; // 15 min idle
const CHECK_INTERVAL = 5000;
const WARNING_TIME = 10 * 1000; // warning before logout

const channel = new BroadcastChannel("auth_channel");

let warningShown = false;
let logoutTriggered = false;

/* =========================
   ACTIVITY TRACKER
========================= */
function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
}

["mousemove","mousedown","keydown","scroll","touchstart"]
.forEach(e => document.addEventListener(e, updateActivity, true));

updateActivity();

/* =========================
   SUPABASE REFRESH TOKEN
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
        console.error("Refresh error:", err);
        return false;
    }
}

/* =========================
   BACKEND EXTEND SESSION
   (optional API call)
========================= */
async function extendSessionBackend() {
    try {
        const token = JSON.parse(localStorage.getItem("sb-session"))?.access_token;

        if (!token) return;

        await fetch(`${SB_URL}/rest/v1/rpc/extend_session`, {
            method: "POST",
            headers: {
                apikey: SB_KEY,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

    } catch (err) {
        console.log("Backend extend failed (ignore)");
    }
}

/* =========================
   BROADCAST LOGOUT
========================= */
function broadcastLogout() {
    channel.postMessage({ type: "LOGOUT" });
}

channel.onmessage = (event) => {
    if (event.data.type === "LOGOUT") {
        doLogout(false);
    }
};

/* =========================
   LOGOUT FUNCTION
========================= */
function doLogout(broadcast = true) {

    if (logoutTriggered) return;
    logoutTriggered = true;

    localStorage.clear();

    if (broadcast) {
        broadcastLogout();
    }

    window.location.replace("login.html");
}

/* =========================
   WARNING POPUP (10s)
========================= */
function showWarning() {

    if (warningShown) return;
    warningShown = true;

    const modal = document.createElement("div");

    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.55);
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:999999;
        ">
            <div style="
                width:320px;
                background:white;
                border-radius:18px;
                text-align:center;
                font-family:system-ui;
                padding:20px;
            ">
                <h3>Session Expiring</h3>
                <p style="color:#666">
                    Anda akan logout dalam 10 saat
                </p>

                <button id="extendBtn" style="
                    width:100%;
                    margin-top:10px;
                    padding:12px;
                    border:none;
                    border-radius:12px;
                    background:#34C759;
                    color:white;
                    font-weight:700;
                ">
                    Extend Session
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("extendBtn").onclick = async () => {

        // refresh session
        const ok = await refreshSupabaseSession();

        if (ok) {
            updateActivity();
            warningShown = false;
            modal.remove();
        } else {
            doLogout(true);
        }
    };

    // auto logout after 10s
    setTimeout(() => {
        doLogout(true);
    }, WARNING_TIME);
}

/* =========================
   SESSION MONITOR LOOP
========================= */
setInterval(async () => {

    const last = Number(localStorage.getItem("lastActivity")) || 0;

    const idleTime = Date.now() - last;

    // WARNING STATE
    if (idleTime > SESSION_TIMEOUT - WARNING_TIME && !warningShown) {
        showWarning();
    }

    // EXPIRED STATE
    if (idleTime > SESSION_TIMEOUT) {

        // try refresh first
        const refreshed = await refreshSupabaseSession();

        if (refreshed) {
            updateActivity();
            warningShown = false;
            return;
        }

        // fallback logout all tabs
        doLogout(true);
    }

}, CHECK_INTERVAL);
const SESSION_TIMEOUT = 20 * 1000; // 15 min idle
const WARNING_TIME = 10 * 1000; // 10s warning
const CHECK_INTERVAL = 5000;

const channel = new BroadcastChannel("auth_channel");

let warningShown = false;
let expiredShown = false;
let countdownInterval = null;
let countdownValue = 10;

/* =========================
   TRACK ACTIVITY
========================= */
function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
}

["mousemove","mousedown","keydown","scroll","touchstart"]
.forEach(e => document.addEventListener(e, updateActivity, true));

updateActivity();

/* =========================
   SUPABASE REFRESH SESSION
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
        console.error("Refresh failed:", err);
        return false;
    }
}

/* =========================
   BACKEND EXTEND (OPTIONAL)
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

    } catch (e) {
        console.log("extendSessionBackend failed (ignored)");
    }
}

/* =========================
   MULTI-TAB LOGOUT SYNC
========================= */
function broadcastLogout() {
    channel.postMessage({ type: "LOGOUT" });
}

channel.onmessage = (event) => {
    if (event.data.type === "LOGOUT") {
        forceLogout(false);
    }
};

/* =========================
   FORCE LOGOUT
========================= */
function forceLogout(broadcast = true) {
    localStorage.clear();

    if (broadcast) broadcastLogout();

    window.location.replace("login.html");
}

/* =========================
   SESSION EXPIRED MODAL
========================= */
function showSessionModal() {

    if (expiredShown) return;
    expiredShown = true;

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
                overflow:hidden;
            ">
                <div style="padding:20px">
                    <h3>Session Expiring</h3>
                    <p style="color:#666">
                        You will be logged out soon
                    </p>

                    <p style="font-weight:700;color:#007AFF">
                        Auto logout in <span id="cd">${countdownValue}</span>s
                    </p>
                </div>

                <button id="extendBtn" style="
                    width:100%;
                    border:none;
                    background:#34C759;
                    color:white;
                    padding:14px;
                    font-weight:700;
                ">
                    Extend Session
                </button>

                <button id="logoutBtn" style="
                    width:100%;
                    border:none;
                    background:#007AFF;
                    color:white;
                    padding:14px;
                    font-weight:700;
                ">
                    Logout Now
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cd = document.getElementById("cd");

    countdownInterval = setInterval(() => {

        countdownValue--;

        if (cd) cd.textContent = countdownValue;

        if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            forceLogout(true);
        }

    }, 1000);

    /* EXTEND SESSION */
    document.getElementById("extendBtn").onclick = async () => {

        clearInterval(countdownInterval);

        const ok = await refreshSupabaseSession();

        if (ok) {
            updateActivity();
            expiredShown = false;
            warningShown = false;
            countdownValue = 10;
            modal.remove();
        } else {
            forceLogout(true);
        }
    };

    /* LOGOUT NOW */
    document.getElementById("logoutBtn").onclick = () => {
        forceLogout(true);
    };
}

/* =========================
   MAIN SESSION LOOP
========================= */
setInterval(async () => {

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    // SHOW WARNING
    if (idle > SESSION_TIMEOUT - WARNING_TIME && !warningShown) {
        warningShown = true;
        showSessionModal();
    }

    // HARD EXPIRE
    if (idle > SESSION_TIMEOUT) {

        const refreshed = await refreshSupabaseSession();

        if (refreshed) {
            updateActivity();
            warningShown = false;
            return;
        }

        forceLogout(true);
    }

}, CHECK_INTERVAL);
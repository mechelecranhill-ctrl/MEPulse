const SESSION_TIMEOUT = 20 * 1000;
const WARNING_TIME = 10 * 1000;
const CHECK_INTERVAL = 5000;

const channel = new BroadcastChannel("auth_channel");

let warningShown = false;
let expired = false;
let countdown = 10;
let countdownInterval;

/* =========================
   ACTIVITY
========================= */
function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
}

["mousemove","mousedown","keydown","scroll","touchstart"]
.forEach(e => document.addEventListener(e, updateActivity, true));

updateActivity();

/* =========================
   FORCE LOGOUT
========================= */
function forceLogout(broadcast = true) {
    localStorage.clear();
    if (broadcast) channel.postMessage({ type: "LOGOUT" });
    window.location.replace("login.html");
}

channel.onmessage = (e) => {
    if (e.data.type === "LOGOUT") {
        forceLogout(false);
    }
};

/* =========================
   REFRESH TOKEN
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
   MODAL
========================= */
function showModal() {

    if (expired) return;
    expired = true;

    const modal = document.createElement("div");

    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:center;z-index:999999;">
        <div style="width:320px;background:white;border-radius:18px;text-align:center;font-family:system-ui;overflow:hidden;">
            
            <div style="padding:20px">
                <h3>Session Expiring</h3>
                <p>You will be logged out soon</p>
                <p style="font-weight:700;color:#007AFF">
                    Auto logout in <span id="cd">${countdown}</span>s
                </p>
            </div>

            <button id="extendBtn" style="width:100%;padding:14px;border:none;background:#34C759;color:white;font-weight:700;">
                Extend Session
            </button>

            <button id="logoutBtn" style="width:100%;padding:14px;border:none;background:#007AFF;color:white;font-weight:700;">
                Logout Now
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
            expired = false;
            warningShown = false;
            countdown = 10;
            modal.remove();
            clearInterval(countdownInterval);
        } else {
            forceLogout(true);
        }
    };

    document.getElementById("logoutBtn").onclick = () => forceLogout(true);
}

/* =========================
   LOOP
========================= */
setInterval(async () => {

    const last = Number(localStorage.getItem("lastActivity")) || 0;
    const idle = Date.now() - last;

    // WARNING
    if (idle > SESSION_TIMEOUT - WARNING_TIME && !warningShown) {
        warningShown = true;
        showModal();
    }

    // EXPIRE
    if (idle > SESSION_TIMEOUT) {
        const ok = await refreshSupabaseSession();

        if (ok) {
            updateActivity();
            warningShown = false;
            return;
        }

        forceLogout(true);
    }

}, CHECK_INTERVAL);

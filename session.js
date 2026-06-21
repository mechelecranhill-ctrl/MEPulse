const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 min idle
const COUNTDOWN_TIME = 10; // 10 saat sebelum logout

let expiredShown = false;
let countdownInterval = null;
let countdownValue = COUNTDOWN_TIME;

function updateActivity() {
    localStorage.setItem("lastActivity", Date.now());
}

// track activity
[
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart"
].forEach(event => {
    document.addEventListener(event, updateActivity, true);
});

updateActivity();

/* =========================
   POPUP SESSION EXPIRED
========================= */
function sessionExpired() {
    if (expiredShown) return;
    expiredShown = true;

    localStorage.clear();

    const modal = document.createElement("div");

    modal.innerHTML = `
        <div id="sessionModal" style="
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
                overflow:hidden;
                text-align:center;
                font-family:system-ui;
                box-shadow:0 10px 30px rgba(0,0,0,.2);
            ">
                <div style="padding:20px">
                    <h3>Session Expired</h3>
                    <p style="color:#666">
                        You Were Inactive For Too Long
                    </p>

                    <p style="font-weight:700;color:#007AFF">
                        Auto logout in <span id="countdown">${countdownValue}</span>s
                    </p>
                </div>

                <button id="extendBtn" style="
                    width:100%;
                    border:none;
                    background:#34C759;
                    color:white;
                    padding:14px;
                    font-weight:700;
                    cursor:pointer;
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
                    cursor:pointer;
                ">
                    Logout Now
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const countdownEl = document.getElementById("countdown");

    function startCountdown() {
        countdownInterval = setInterval(() => {
            countdownValue--;

            if (countdownEl) {
                countdownEl.textContent = countdownValue;
            }

            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                doLogout();
            }
        }, 1000);
    }

    function doLogout() {
        localStorage.clear();
        window.location.replace("login.html");
    }

    // Extend session
    document.getElementById("extendBtn").onclick = () => {
        clearInterval(countdownInterval);

        // reset session
        localStorage.setItem("lastActivity", Date.now());

        // remove modal
        modal.remove();

        // reset state
        expiredShown = false;
        countdownValue = COUNTDOWN_TIME;
    };

    // logout now
    document.getElementById("logoutBtn").onclick = doLogout;

    startCountdown();
}

/* =========================
   AUTO CHECK SESSION
========================= */
setInterval(() => {
    const last = Number(localStorage.getItem("lastActivity")) || 0;

    if (Date.now() - last > SESSION_TIMEOUT) {
        sessionExpired();
    }
}, 5000);
const SESSION_TIMEOUT = 15 * 60 * 1000;

function sessionExpired(){

    localStorage.clear();

    const modal = document.createElement("div");

    modal.innerHTML = `
        <div style="
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.45);
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:99999;
        ">
            <div style="
                width:300px;
                background:white;
                border-radius:18px;
                overflow:hidden;
                text-align:center;
                font-family:system-ui;
            ">
                <div style="padding:20px">
                    <h3>Sesi Tamat</h3>
                    <p style="color:#666">
                        Anda tidak aktif selama 15 minit.
                        Sila log masuk semula.
                    </p>
                </div>

                <button id="expiredBtn" style="
                    width:100%;
                    border:none;
                    background:#007AFF;
                    color:white;
                    padding:14px;
                    font-weight:600;
                ">
                    OK
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("expiredBtn")
    .onclick = () => {
        window.location.replace("login.html");
    };
}

const last =
    Number(localStorage.getItem("lastActivity")) || 0;

if(
    last &&
    Date.now() - last > SESSION_TIMEOUT
){
    localStorage.clear();
    window.location.replace("login.html");
}

function updateActivity(){
    localStorage.setItem(
        "lastActivity",
        Date.now()
    );
}

[
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart"
].forEach(event => {
    document.addEventListener(
        event,
        updateActivity,
        true
    );
});

if(!last){
    updateActivity();
}

setInterval(() => {

    const last =
        Number(localStorage.getItem("lastActivity")) || 0;

    if(Date.now() - last > SESSION_TIMEOUT){

        localStorage.clear();

        window.location.replace(
            "login.html"
        );
    }

}, 5000);
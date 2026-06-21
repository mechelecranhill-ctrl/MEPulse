const SESSION_TIMEOUT = 15 * 60 * 1000;

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
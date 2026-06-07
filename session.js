const SESSION_TIMEOUT = 15 * 60 * 1000;

function resetSessionTimer(){

    clearTimeout(window.sessionTimer);

    window.sessionTimer = setTimeout(() => {

        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userId");
        localStorage.removeItem("role");

        alert("Session Timeout");

        window.location.replace("login.html");

    }, SESSION_TIMEOUT);
}

[
    "mousemove",
    "mousedown",
    "click",
    "scroll",
    "keydown",
    "touchstart"
].forEach(event => {

    document.addEventListener(
        event,
        resetSessionTimer,
        true
    );

});

resetSessionTimer();

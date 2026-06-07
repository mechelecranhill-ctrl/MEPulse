(function(){

    const loggedIn = localStorage.getItem("loggedIn");

    if(loggedIn !== "true"){
        window.location.replace("login.html");
    }

})();

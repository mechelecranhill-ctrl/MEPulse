// CREATE LOADING HTML AUTOMATICALLY
function showGlobalLoader() {
    const loader = document.createElement("div");
    loader.id = "globalLoader";

    loader.innerHTML = `
        <div class="loader-box">
            <div class="spinner"></div>
            <h3>Loading Sistem</h3>
            <p>Sila tunggu sebentar...</p>

            <div class="progress">
                <div class="progress-bar"></div>
            </div>
        </div>
    `;

    document.body.appendChild(loader);
}

// REMOVE LOADING
function hideGlobalLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) {
        loader.style.opacity = "0";
        loader.style.transition = "0.3s";
        setTimeout(() => loader.remove(), 300);
    }
}

// AUTO START
document.addEventListener("DOMContentLoaded", () => {
    showGlobalLoader();

    // contoh delay (boleh tukar ikut API ready)
    setTimeout(() => {
        hideGlobalLoader();
    }, 2000);
});
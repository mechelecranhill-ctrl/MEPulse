/* Moved out of sections.html's inline <script> so it only
   ever registers once, regardless of which view is active. */
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("cache.js")
        .then(() => console.log("Service Worker Registered"))
        .catch(err => console.error(err));
}

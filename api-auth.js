// Hantar token login secara automatik pada setiap permintaan ke me-connect-api
(function () {
    const API_HOST = "me-connect-api.mech-elec-ranhill.workers.dev";
    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
        try {
            const rawUrl = typeof input === "string" ? input : (input && input.url) || "";
            const host = new URL(rawUrl, window.location.href).hostname;

            if (host === API_HOST) {
                const token = localStorage.getItem("me_token");

                if (token) {
                    init = init || {};
                    const baseHeaders = init.headers ||
                        (typeof input !== "string" && input.headers) || {};
                    const headers = new Headers(baseHeaders);

                    if (!headers.has("Authorization")) {
                        headers.set("Authorization", "Bearer " + token);
                    }
                    init.headers = headers;
                }
            }
        } catch (_) {
            // kalau ada masalah, teruskan fetch biasa
        }
        return originalFetch(input, init);
    };
})();

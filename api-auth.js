(function () {
    const API_HOST = "me-connect-api.mech-elec-ranhill.workers.dev";
    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (input, init) {
        let isApi = false;
        let path = "";

        try {
            const rawUrl = typeof input === "string" ? input : (input && input.url) || "";
            const u = new URL(rawUrl, window.location.href);
            isApi = (u.hostname === API_HOST);
            path = u.pathname;

            if (isApi) {
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
        } catch (_) {}

        const response = await originalFetch(input, init);

        if (isApi && response.status === 401 && path !== "/login") {
            localStorage.clear();
            window.location.href = "login.html";
        }

        return response;
    };
})();

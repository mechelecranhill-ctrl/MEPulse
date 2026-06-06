class AppSidebar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="overlay" id="overlay"></div>

            <div class="sidebar" id="sidebar">
                <h3>M&E Menu</h3>

                <a href="sections.html">Home</a>
                <a href="#" id="dashboardBtn">Dashboard</a>
                <a href="#" id="logoutBtn">Logout</a>
            </div>

            <button class="hamburger" id="hamburger" aria-label="Menu">
    <input type="checkbox" id="menuToggle">
    <svg viewBox="0 0 32 32">
        <path class="line line-top-bottom"
              d="M27 10H5C2.8 10 1 8.2 1 6C1 3.8 2.8 2 5 2C7.2 2 9 3.8 9 6V26C9 28.2 7.2 30 5 30" />
        <path class="line"
              d="M7 16H25" />
    </svg>
</button>
        `;

        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.sidebar = this.querySelector("#sidebar");
        this.overlay = this.querySelector("#overlay");
        this.btn = this.querySelector("#hamburger");
this.checkbox = this.querySelector("#menuToggle");
        this.logoutBtn = this.querySelector("#logoutBtn");
        this.dashboardBtn = this.querySelector("#dashboardBtn");
    }

    bindEvents() {
        this.btn.addEventListener("click", () => this.toggle());
        this.overlay.addEventListener("click", () => this.close());

        this.logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.logout();
        });

        this.dashboardBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.goDashboard();
        });

        // ESC close (UX upgrade)
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    toggle() {
        this.sidebar.classList.toggle("active");
        this.overlay.classList.toggle("active");

this.checkbox.checked = !this.checkbox.checked;
    }

    close() {
        this.sidebar.classList.remove("active");
        this.overlay.classList.remove("active");

this.checkbox.checked = false;
    }

    logout() {
        localStorage.removeItem("me_user");
        sessionStorage.clear();
        window.location.href = "login.html";
    }

    goDashboard() {
        const section =
            localStorage.getItem("current_section") || "GENERAL";

        window.location.href =
            `dashboard-contract.html?section=${encodeURIComponent(section)}`;
    }
}

customElements.define("app-sidebar", AppSidebar);
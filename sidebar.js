class AppSidebar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="overlay" id="overlay"></div>

            <div class="sidebar" id="sidebar">
                <h3>M&E Menu</h3>
                
                <a href="sections.html">Home</a>
                <div class="menu-group">
                <a href="#" class="menu-parent" id="dashboardBtn">
                Dashboard ▼
                </a>
                
                <div class="submenu" id="dashboardMenu">
                <a href="dashboard-contract.html?section=Seksyen%20Selenggara">
                Seksyen Selenggara
                </a>
                
                <a href="dashboard-contract.html?section=Seksyen%20Pematuhan%20Peraturan">
                Seksyen Pematuhan Peraturan
                </a>
                
                <a href="dashboard-contract.html?section=Seksyen%20Pengurusan%20Aset%20%26%20Kewangan">
                Seksyen Pengurusan Aset & Kewangan 
                </a>
                
                <a href="dashboard-contract.html?section=Seksyen%20Projek%20%26%20Perkhidmatan%20Teknikal">
                Seksyen Projek & Perkhidmatan Teknikal
                </a>
                </div>
                
                </div>
                
                <a href="#" id="logoutBtn">Logout</a>
            
            </div>

            <button class="hamburger" id="hamburger" aria-label="Menu">
            <input type="checkbox" id="menuToggle">
            <svg viewBox="0 0 32 32">
            <path class="line line-top-bottom"
            d="M27 10 13 10C10.8 10 9 8.2 9 6
             9 3.5 10.8 2 13 2
             15.2 2 17 3.8 17 6
             L17 26C17 28.2 18.8 30 21 30
             23.2 30 25 28.2 25 26
             25 23.8 23.2 22 21 22
             L7 22" />
             
             <path class="line"
             d="M7 16 27 16" />
             
             </svg>
             </button>
             <div class="logout-modal" id="logoutModal">
    <div class="logout-box">
        <h3>Logout</h3>
        <p>Are you sure you want to logout?</p>

        <div class="logout-actions">
            <button class="cancel-btn" id="cancelLogout">
                Cancel
            </button>

            <button class="confirm-btn" id="confirmLogout">
                Logout
            </button>
        </div>
    </div>
</div>`;

        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.sidebar = this.querySelector("#sidebar");
        this.overlay = this.querySelector("#overlay");
        this.btn = this.querySelector("#hamburger");
        this.checkbox = this.querySelector("#menuToggle");
        this.logoutBtn = this.querySelector("#logoutBtn");

this.logoutModal = this.querySelector("#logoutModal");
this.cancelLogout = this.querySelector("#cancelLogout");
this.confirmLogout = this.querySelector("#confirmLogout");

        this.dashboardBtn = this.querySelector("#dashboardBtn");
        this.dashboardMenu = this.querySelector("#dashboardMenu");
    }

    bindEvents() {
        this.btn.addEventListener("click", () => this.toggle());
        this.overlay.addEventListener("click", () => this.close());

        this.logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    this.logoutModal.classList.add("active");
});

this.cancelLogout.addEventListener("click", () => {
    this.logoutModal.classList.remove("active");
});

this.confirmLogout.addEventListener("click", () => {
    this.logout();
});

this.logoutModal.addEventListener("click", (e) => {
    if (e.target === this.logoutModal) {
        this.logoutModal.classList.remove("active");
    }
});
        
        this.dashboardBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.dashboardMenu.classList.toggle("active");
});

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    toggle() {
    const isOpen = this.sidebar.classList.toggle("active");
    this.overlay.classList.toggle("active");

    this.checkbox.checked = isOpen;
}

close() {
    this.sidebar.classList.remove("active");
    this.overlay.classList.remove("active");

    this.checkbox.checked = false;
}

logout() {

    localStorage.clear();
    sessionStorage.clear();

    window.location.replace("login.html");
}

    goDashboard() {
        const section =
            localStorage.getItem("current_section") || "GENERAL";

        window.location.href =
            `dashboard-contract.html?section=${encodeURIComponent(section)}`;
    }
}

customElements.define("app-sidebar", AppSidebar);

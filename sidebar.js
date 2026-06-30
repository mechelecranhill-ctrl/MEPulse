class AppSidebar extends HTMLElement {
    connectedCallback() {
        const staffName = localStorage.getItem("staff_name") || "USER";
        const staffRole = localStorage.getItem("role") || "STAFF";
        const staffAvatar = localStorage.getItem("staff_avatar") || "";

        const avatarHtml = staffAvatar
            ? `<img src="${staffAvatar}" alt="Profile">`
            : `<i class="fa-solid fa-user-circle"></i>`;

        this.innerHTML = `
            <div class="overlay" id="overlay"></div>

            <div class="sidebar" id="sidebar">

                <div class="sidebar-profile">
                    <div class="profile-img-wrapper">
                        ${avatarHtml}
                    </div>
                    <div class="profile-name">${staffName.toUpperCase()}</div>
                    <div class="profile-role">${staffRole.toUpperCase()}</div>
                </div>

                <a href="sections.html" class="menu-link" data-page="home">Home</a>

                <div class="menu-group">
                    <a href="#" class="menu-parent" id="dashboardBtn">
                        Dashboard ▼
                    </a>

                    <div class="submenu" id="dashboardMenu">
                        <a href="#" data-section="Seksyen Selenggara" class="menu-link">
                            Seksyen Selenggara
                        </a>

                        <a href="#" data-section="Seksyen Pematuhan Peraturan" class="menu-link">
                            Seksyen Pematuhan Peraturan
                        </a>

                        <a href="#" data-section="Seksyen Pengurusan Aset & Kewangan" class="menu-link">
                            Seksyen Pengurusan Aset & Kewangan
                        </a>

                        <a href="#" data-section="Seksyen Projek & Perkhidmatan Teknikal" class="menu-link">
                            Seksyen Projek & Perkhidmatan Teknikal
                        </a>
                    </div>
                </div>

                <a href="contract-closing.html" class="menu-link" data-page="contract">
                    Contract Closing
                </a>

                <a href="#" id="logoutBtn" class="menu-link">Logout</a>
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
                    <path class="line" d="M7 16 27 16" />
                </svg>
            </button>

            <div class="logout-modal" id="logoutModal">
                <div class="logout-box">
                    <h3>Logout</h3>
                    <p>Are you sure you want to logout?</p>
                    <div class="logout-actions">
                        <button class="cancel-btn" id="cancelLogout">Cancel</button>
                        <button class="confirm-btn" id="confirmLogout">Logout</button>
                    </div>
                </div>
            </div>
        `;

        this.cacheDOM();
        this.bindEvents();
        this.loadDashboardLinks();
        this.setActiveMenu(); // ⭐ IMPORTANT
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

        this.menuLinks = this.querySelectorAll(".menu-link");
        this.subLinks = this.querySelectorAll("#dashboardMenu a[data-section]");
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

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    async loadDashboardLinks() {
        const sbUrl = "https://ywmsvowroxzhrjwrhsru.supabase.co";
        const sbKey = "YOUR_SUPABASE_KEY";

        try {
            const res = await fetch(
                `${sbUrl}/rest/v1/me_sections?select=id,section_name`,
                {
                    headers: {
                        apikey: sbKey,
                        Authorization: `Bearer ${sbKey}`
                    }
                }
            );

            const sections = await res.json();

            this.subLinks.forEach(a => {
                const name = a.dataset.section;
                const sec = sections.find(s => s.section_name === name);

                if (sec) {
                    a.href = `dashboard-contract.html?section=${sec.id}`;
                    a.dataset.sectionId = sec.id;
                }
            });

            this.setActiveMenu(); // re-check after load
        } catch (e) {
            console.error("Error loading dashboard links:", e);
        }
    }

    setActiveMenu() {
        const url = new URL(window.location.href);

        const currentSection = url.searchParams.get("section");
        const path = window.location.pathname.split("/").pop();

        // reset all
        this.menuLinks.forEach(el => el.classList.remove("active"));
        this.subLinks.forEach(el => el.classList.remove("active"));

        // ⭐ HOME / CONTRACT highlight
        this.menuLinks.forEach(link => {
            if (link.getAttribute("href") === path) {
                link.classList.add("active");
            }
        });

        // ⭐ SUBMENU highlight by section ID
        if (currentSection) {
            this.subLinks.forEach(link => {
                if (link.dataset.sectionId === currentSection) {
                    link.classList.add("active");

                    // open submenu automatically
                    const submenu = this.querySelector("#dashboardMenu");
                    if (submenu) submenu.classList.add("open");
                }
            });
        }
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
}

customElements.define("app-sidebar", AppSidebar);

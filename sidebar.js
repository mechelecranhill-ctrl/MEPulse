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

                <a href="sections.html" class="menu-link">Home</a>

                <div class="menu-group">
                    <a href="#" class="menu-parent" id="dashboardBtn">
                        Dashboard-Contracts <span class="arrow">▼</span>
                    </a>
                    <div class="submenu" id="dashboardMenu">
                        <a href="#" data-section="Seksyen Selenggara" class="menu-link">Seksyen Selenggara</a>
                        <a href="#" data-section="Seksyen Pematuhan Peraturan" class="menu-link">Seksyen Pematuhan Peraturan</a>
                        <a href="#" data-section="Seksyen Pengurusan Aset & Kewangan" class="menu-link">Seksyen Pengurusan Aset & Kewangan</a>
                        <a href="#" data-section="Seksyen Projek & Perkhidmatan Teknikal" class="menu-link">Seksyen Projek & Perkhidmatan Teknikal</a>
                    </div>
                </div>

                <div class="menu-group">
                    <a href="#" class="menu-parent" id="quotationBtn">
                        Quotations Approval <span class="arrow">▼</span>
                    </a>
                    <div class="submenu" id="quotationMenu">
                        <!-- Updated to app-tech.html -->
                        <a href="app-tech.html" class="menu-link">Technician</a>
                        <a href="app-exec.html" class="menu-link">Executive</a>
                        <a href="app-sect.html" class="menu-link">Section Head</a>
                        <a href="app-dept.html" class="menu-link">Department Head</a>
                    </div>
                </div>

                <a href="contract-closing.html" class="menu-link">Contract Closing</a>
                <a href="#" id="logoutBtn" class="menu-link">Logout</a>
            </div>

            <div class="hamburger-wrapper">
                <button class="hamburger" id="hamburger">
                    <input type="checkbox" id="menuToggle">
                    <svg viewBox="0 0 32 32">
                        <path class="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6 L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22 L7 22" />
                        <path class="line" d="M7 16 27 16" />
                    </svg>
                </button>
            </div>
            <div class="hamburger-box"></div>

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
        this.setActiveMenu();
    }

    cacheDOM() {
        this.sidebar = this.querySelector("#sidebar");
        this.overlay = this.querySelector("#overlay");
        this.btn = this.querySelector("#hamburger");
        this.checkbox = this.querySelector("#menuToggle");

        this.logoutBtn = this.querySelector("#logoutBtn");
        this.logoutModal = this.querySelector("#logoutModal");

        // Dashboard Elements
        this.dashboardBtn = this.querySelector("#dashboardBtn");
        this.dashboardMenu = this.querySelector("#dashboardMenu");
        this.dashArrow = this.querySelector("#dashboardBtn .arrow");

        // Quotation Elements
        this.quotationBtn = this.querySelector("#quotationBtn");
        this.quotationMenu = this.querySelector("#quotationMenu");
        this.quoteArrow = this.querySelector("#quotationBtn .arrow");

        this.menuLinks = this.querySelectorAll(".menu-link");
        this.subLinks = this.querySelectorAll("#dashboardMenu a[data-section]");
    }

    bindEvents() {
        this.btn.addEventListener("click", () => this.toggle());
        this.overlay.addEventListener("click", () => this.close());

        // Toggle Dashboard Menu
        this.dashboardBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = this.dashboardMenu.classList.toggle("open");
            this.dashArrow.innerText = isOpen ? "▲" : "▼";
        });

        // Toggle Quotation Menu
        this.quotationBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = this.quotationMenu.classList.toggle("open");
            this.quoteArrow.innerText = isOpen ? "▲" : "▼";
        });

        // Logout
        this.logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.logoutModal.classList.add("active");
        });

        this.querySelector("#cancelLogout").onclick = () => this.logoutModal.classList.remove("active");
        this.querySelector("#confirmLogout").onclick = () => this.logout();

        // Section Links
        this.subLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                if (link.dataset.sectionId) {
                    window.location.href = `dashboard-contract.html?section=${link.dataset.sectionId}`;
                }
            });
        });
    }

    async loadDashboardLinks() {
        try {
            const res = await fetch(`${SB_URL}/rest/v1/me_sections?select=id,section_name`, {
                headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
            });
            if (!res.ok) return;
            const sections = await res.json();
            this.subLinks.forEach(a => {
                const match = sections.find(s => s.section_name === a.dataset.section);
                if (match) a.dataset.sectionId = match.id;
            });
        } catch (e) { console.error(e); }
    }

    setActiveMenu() {
        const path = window.location.pathname.split("/").pop();
        
        // Highlight active sub-page
        this.menuLinks.forEach(link => {
            if (link.getAttribute("href") === path) link.classList.add("active");
        });

        // Included app-tech.html to auto-expand the dropdown when active
        const quotePages = ['app-tech.html', 'app-exec.html', 'app-sect.html', 'app-dept.html'];
        if (quotePages.includes(path)) {
            this.quotationMenu.classList.add("open");
            this.quoteArrow.innerText = "▲";
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
        window.location.href = "login.html";
    }
}

customElements.define("app-sidebar", AppSidebar);

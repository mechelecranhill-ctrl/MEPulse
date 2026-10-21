class AppSidebar extends HTMLElement {
    connectedCallback() {
        const staffName = localStorage.getItem("staff_name") || "USER";
        const staffRole = localStorage.getItem("role") || "STAFF";
        const staffAvatar = localStorage.getItem("avatar_url") || "";

        const avatarHtml = staffAvatar
            ? `<img src="${staffAvatar}" alt="Profile">`
            : `<i class="fa-solid fa-user-circle"></i>`;

        this.innerHTML = `
            <div class="overlay" id="overlay"></div>

            <div class="sidebar" id="sidebar">

                <div class="sidebar-profile">
                    <div class="profile-img-wrapper" id="profileBtn" title="Edit profile">
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
                        Blueform Approvals <span class="arrow">▼</span>
                    </a>
                    <div class="submenu" id="quotationMenu">
                        <a href="app-tech.html" class="menu-link">Document Preparations</a>
                        <a href="app-exec.html" class="menu-link">Request for Approval</a>
                        <a href="app-sect.html" class="menu-link">Review & Verification</a>
                        <a href="app-dept.html" class="menu-link">Approval Endorsement</a>
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

            <div class="logout-modal" id="profileModal">
                <div class="logout-box profile-edit-box">
                    <h3>Edit Staff Profile</h3>

                    <input id="peName" class="pe-input" placeholder="Staff name">
                    <input id="peEmployee" class="pe-input" placeholder="Employee ID">
                    <input id="pePhone" class="pe-input" placeholder="Phone number">
                    <input id="peEmail" class="pe-input" placeholder="Email">

                    <label class="pe-label">Signature (JPG/PNG)</label>
                    <div class="pe-drop" id="peSigDrop">
                        <input type="file" id="peSigFile" accept="image/jpeg,image/png" style="display:none;">
                        <div id="peSigEmpty"><i class="fa-solid fa-signature"></i>Select signature file</div>
                        <div class="pe-wrap" id="peSigWrap">
                            <img id="peSigImg" src="" alt="Signature">
                            <button type="button" class="pe-remove" id="peSigClear">Remove signature</button>
                        </div>
                    </div>

                    <label class="pe-label">Initial (JPG/PNG)</label>
                    <div class="pe-drop" id="peInitDrop">
                        <input type="file" id="peInitFile" accept="image/jpeg,image/png" style="display:none;">
                        <div id="peInitEmpty"><i class="fa-solid fa-pen-fancy"></i>Select initial file</div>
                        <div class="pe-wrap" id="peInitWrap">
                            <img id="peInitImg" src="" alt="Initial">
                            <button type="button" class="pe-remove" id="peInitClear">Remove initial</button>
                        </div>
                    </div>

                    <div class="logout-actions">
                        <button class="cancel-btn" id="cancelProfile">Cancel</button>
                        <button class="edit-btn" id="saveProfile">Save</button>
                    </div>
                </div>
            </div>

            <div class="logout-modal" id="sigWarnModal">
                <div class="logout-box notice-box">
                    <div class="notice-icon warning"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h3 id="sigWarnTitle">Signature Not Found</h3>
                    <p id="sigWarnMsg">You need a signature before you can approve. Upload your signature now?</p>
                    <div class="logout-actions">
                        <button class="cancel-btn" id="sigWarnNo">Later</button>
                        <button class="edit-btn" id="sigWarnYes">Upload Now</button>
                    </div>
                </div>
            </div>

            <div class="logout-modal" id="noticeModal">
                <div class="logout-box notice-box">
                    <div class="notice-icon" id="noticeIcon"></div>
                    <h3 id="noticeTitle"></h3>
                    <p id="noticeMsg"></p>
                    <div class="logout-actions">
                        <button class="edit-btn" id="noticeOk">OK</button>
                    </div>
                </div>
            </div>
        `;

        this.cacheDOM();
        this.bindEvents();
        this.loadDashboardLinks();
        this.setActiveMenu();

        if (localStorage.getItem("role") === "guest") {
    this.querySelector("#quotationBtn").closest(".menu-group").style.display = "none";
    this.querySelector('a[href="contract-closing.html"]').style.display = "none";
    this.profileBtn.style.pointerEvents = "none";   // guest tak boleh edit profil
}
    }

    cacheDOM() {
        this.sidebar = this.querySelector("#sidebar");
        this.overlay = this.querySelector("#overlay");
        this.btn = this.querySelector("#hamburger");
        this.checkbox = this.querySelector("#menuToggle");

        this.logoutBtn = this.querySelector("#logoutBtn");
        this.logoutModal = this.querySelector("#logoutModal");

        this.profileBtn = this.querySelector("#profileBtn");
        this.profileModal = this.querySelector("#profileModal");
        this.sigWarnModal = this.querySelector("#sigWarnModal");
        this.noticeModal = this.querySelector("#noticeModal");
        this.saveBtn = this.querySelector("#saveProfile");

        this.dashboardBtn = this.querySelector("#dashboardBtn");
        this.dashboardMenu = this.querySelector("#dashboardMenu");
        this.dashArrow = this.querySelector("#dashboardBtn .arrow");

        this.quotationBtn = this.querySelector("#quotationBtn");
        this.quotationMenu = this.querySelector("#quotationMenu");
        this.quoteArrow = this.querySelector("#quotationBtn .arrow");

        this.menuLinks = this.querySelectorAll(".menu-link");
        this.subLinks = this.querySelectorAll("#dashboardMenu a[data-section]");
    }

    bindEvents() {
        this.btn.addEventListener("click", () => this.toggle());
        this.overlay.addEventListener("click", () => this.close());

        this.dashboardBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = this.dashboardMenu.classList.toggle("open");
            this.dashArrow.innerText = isOpen ? "▲" : "▼";
        });

        this.quotationBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const isOpen = this.quotationMenu.classList.toggle("open");
            this.quoteArrow.innerText = isOpen ? "▲" : "▼";
        });

        this.logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.logoutModal.classList.add("active");
        });

        this.querySelector("#cancelLogout").onclick = () => this.logoutModal.classList.remove("active");
        this.querySelector("#confirmLogout").onclick = () => this.logout();

        this.profileBtn.addEventListener("click", () => this.openProfile());
        this.querySelector("#cancelProfile").onclick = () => this.closeProfile();
        this.saveBtn.onclick = () => this.saveProfile();
        this.profileModal.addEventListener("click", (e) => {
            if (e.target === this.profileModal) this.closeProfile();
        });

        this.querySelector("#sigWarnNo").onclick = () => this.sigWarnModal.classList.remove("active");
        this.querySelector("#sigWarnYes").onclick = () => {
            this.sigWarnModal.classList.remove("active");
            this.openProfile();
        };

        this.querySelector("#noticeOk").onclick = () => this.noticeModal.classList.remove("active");
        this.noticeModal.addEventListener("click", (e) => {
            if (e.target === this.noticeModal) this.noticeModal.classList.remove("active");
        });

        ["peSig", "peInit"].forEach(p => {
            const drop = this.querySelector(`#${p}Drop`);
            const file = this.querySelector(`#${p}File`);
            drop.addEventListener("click", () => file.click());
            file.addEventListener("change", () => this.readImage(file, p));
            this.querySelector(`#${p}Clear`).addEventListener("click", (e) => {
                e.stopPropagation();
                this.setImage(p, null);
            });
        });

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
            const res = await fetch(`${API_URL}/rest/v1/me_sections?select=id,section_name`);
            if (!res.ok) return;
            const sections = await res.json();

            this.subLinks.forEach(a => {
                const match = sections.find(s => s.section_name === a.dataset.section);
                if (match) a.dataset.sectionId = match.id;
            });

            this.setActiveMenu();
        } catch (e) {
            console.error("Error loading dashboard links:", e);
        }
    }

    setActiveMenu() {
        const fullPath = window.location.pathname.split("/").pop();
        const urlParams = new URLSearchParams(window.location.search);
        const currentSectionId = urlParams.get("section");

        this.menuLinks.forEach(link => link.classList.remove("active"));

        if (fullPath === "dashboard-contract.html") {
            this.dashboardMenu.classList.add("open");
            this.dashArrow.innerText = "▲";

            if (currentSectionId) {
                this.subLinks.forEach(link => {
                    if (link.dataset.sectionId === currentSectionId) {
                        link.classList.add("active");
                    }
                });
            }
        }

        const quotePages = ['app-tech.html', 'app-exec.html', 'app-sect.html', 'app-dept.html'];
        if (quotePages.includes(fullPath)) {
            this.quotationMenu.classList.add("open");
            this.quoteArrow.innerText = "▲";
        }

        this.menuLinks.forEach(link => {
            const href = link.getAttribute("href");
            if (href && href !== "#" && href === fullPath) {
                link.classList.add("active");
            }
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

    showNotice(type, title, message) {
        const icons = {
            success: "fa-circle-check",
            error: "fa-circle-xmark",
            warning: "fa-triangle-exclamation"
        };
        const icon = this.querySelector("#noticeIcon");
        icon.className = `notice-icon ${type}`;
        icon.innerHTML = `<i class="fa-solid ${icons[type] || icons.warning}"></i>`;
        this.querySelector("#noticeTitle").textContent = title;
        this.querySelector("#noticeMsg").textContent = message;
        this.noticeModal.classList.add("active");
    }

    async openProfile() {
        const staffId = localStorage.getItem("staff_id");
        if (!staffId) {
            this.showNotice("warning", "Staff ID Not Found", "Please log in again and try once more.");
            return;
        }

        this.profileModal.classList.add("active");

        try {
            const res = await fetch(
                `${API_URL}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}&select=id,name,position,employee_id,phone_no,email,signature,initial`
            );
            if (!res.ok) throw new Error("Failed to load staff data");
            const rows = await res.json();
            const row = rows && rows[0];
            if (!row) throw new Error("Staff not found");

            this.staffRow = row;
            this.querySelector("#peName").value = row.name || "";
            this.querySelector("#peEmployee").value = row.employee_id || "";
            this.querySelector("#pePhone").value = row.phone_no || "";
            this.querySelector("#peEmail").value = row.email || "";
            this.setImage("peSig", row.signature || null);
            this.setImage("peInit", row.initial || null);
        } catch (e) {
            console.error(e);
            this.closeProfile();
            this.showNotice("error", "Unable to Load", "Staff information could not be loaded. Please try again.");
        }
    }

    closeProfile() {
        this.profileModal.classList.remove("active");
    }

    promptSignature() {
        this.promptMissing("signature");
    }

    promptMissing(type) {
        const isInitial = type === "initial";
        this.querySelector("#sigWarnTitle").textContent = isInitial ? "Initial Not Found" : "Signature Not Found";
        this.querySelector("#sigWarnMsg").textContent = isInitial
            ? "You need an initial before you can submit. Upload your initial now?"
            : "You need a signature before you can approve. Upload your signature now?";
        this.sigWarnModal.classList.add("active");
    }

    readImage(input, prefix) {
        const file = input.files && input.files[0];
        if (!file) return;
        if (file.type !== "image/jpeg" && file.type !== "image/png") {
            input.value = "";
            this.showNotice("warning", "Invalid File", "Please select a JPG or PNG file only.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => this.setImage(prefix, e.target.result);
        reader.readAsDataURL(file);
    }

    setImage(prefix, base64) {
        if (!this.images) this.images = {};
        this.images[prefix] = base64;
        this.querySelector(`#${prefix}Img`).src = base64 || "";
        this.querySelector(`#${prefix}Empty`).style.display = base64 ? "none" : "block";
        this.querySelector(`#${prefix}Wrap`).style.display = base64 ? "flex" : "none";
        if (!base64) this.querySelector(`#${prefix}File`).value = "";
    }

    async saveProfile() {
        const row = this.staffRow;
        if (!row) return;

        const name = this.querySelector("#peName").value.trim();
        if (!name) {
            this.showNotice("warning", "Name Required", "Please enter the staff name before saving.");
            return;
        }

        const val = (id) => this.querySelector(id).value.trim() || null;

        const body = {
            name,
            position: row.position,
            employee_id: val("#peEmployee"),
            phone_no: val("#pePhone"),
            email: val("#peEmail"),
            signature: this.images.peSig || null,
            initial: this.images.peInit || null
        };

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = "Saving...";

        try {
            const res = await fetch(`${API_URL}/staff/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save");
            }

            localStorage.setItem("staff_name", name);
            this.querySelector(".profile-name").textContent = name.toUpperCase();

            this.closeProfile();
            this.showNotice("success", "Saved", "Your staff information has been updated successfully.");
        } catch (e) {
            console.error(e);
            this.showNotice("error", "Save Failed", e.message);
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = "Save";
        }
    }

    logout() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
    }
}

customElements.define("app-sidebar", AppSidebar);

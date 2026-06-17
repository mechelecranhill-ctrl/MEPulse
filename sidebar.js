const SB_URL = "https://ywmsvowroxzhrjwrhsru.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXN2b3dyb3h6aHJqd3Joc3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDU5MzcsImV4cCI6MjA4Nzg4MTkzN30.OHJ-I_T3QID8y8eaoOBWeG2nKd2FhHfzG4P515Rzfks";

class AppSidebar extends HTMLElement {
    connectedCallback() {
        const staffName = localStorage.getItem("staff_name") || "USER";
        const staffRole = localStorage.getItem("role") || "STAFF";
        const staffAvatar = localStorage.getItem("staff_avatar") || ""; 

        let avatarHtml = '';
        if (staffAvatar && staffAvatar.trim() !== "") {
            avatarHtml = `<img src="${staffAvatar}" alt="Profile" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        
        const placeholderHtml = `
            <div class="avatar-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.2); color:white; font-size:28px; font-weight:bold; border-radius:50%;">
                ${staffName.charAt(0).toUpperCase()}
            </div>
        `;

        this.innerHTML = `
            <div class="overlay" id="overlay"></div>

            <div class="sidebar" id="sidebar">
                <div class="sidebar-profile">
                    <div class="profile-img-wrapper" id="avatarClickable" style="position:relative; width:80px; height:80px; border-radius:50%; margin-bottom:10px; overflow:hidden; cursor:pointer;" title="Klik untuk tukar gambar profil">
                        ${avatarHtml}
                        ${staffAvatar ? placeholderHtml.replace("display:flex", "display:none") : placeholderHtml}
                        <input type="file" id="avatarInput" accept="image/*" style="display:none;">
                    </div>
                    <div class="profile-name" id="profName" style="color:white; font-weight:700;">${staffName.toUpperCase()}</div>
                    <div class="profile-role" id="profRole" style="color:rgba(255,255,255,0.6); font-size:11px;">${staffRole.toUpperCase()}</div>
                </div>
                
                <a href="sections.html">Home</a>
                <div class="menu-group">
                    <a href="#" class="menu-parent" id="dashboardBtn">Dashboard ▼</a>
                    <div class="submenu" id="dashboardMenu" style="display:none;">
                        <a href="dashboard-contract.html?section=Seksyen%20Selenggara">Seksyen Selenggara</a>
                        <a href="dashboard-contract.html?section=Seksyen%20Pematuhan%20Peraturan">Seksyen Pematuhan Peraturan</a>
                        <a href="dashboard-contract.html?section=Seksyen%20Pengurusan%20Aset%20%26%20Kewangan">Seksyen Pengurusan Aset & Kewangan</a>
                        <a href="dashboard-contract.html?section=Seksyen%20Projek%20%26%20Perkhidmatan%20Teknikal">Seksyen Projek & Perkhidmatan Teknikal</a>
                    </div>
                </div>
                <a href="#" id="logoutBtn">Logout</a>
            </div>

            <button class="hamburger" id="hamburger" aria-label="Menu">
                <input type="checkbox" id="menuToggle">
                <svg viewBox="0 0 32 32">
                    <path class="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6 L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22 L7 22" />
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
            </div>`;

        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        try {
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
            this.avatarWrapper = this.querySelector("#avatarClickable");
            this.avatarInput = this.querySelector("#avatarInput");
        } catch (e) {
            console.error("CacheDOM gagal tetapi diselamatkan:", e);
        }
    }

    bindEvents() {
        if (this.btn) this.btn.addEventListener("click", () => this.toggle());
        if (this.overlay) this.overlay.addEventListener("click", () => this.close());

        if (this.avatarWrapper && this.avatarInput) {
            this.avatarWrapper.addEventListener("click", (e) => {
                e.stopPropagation(); // Elak konflik penutupan modal halaman sections
                this.avatarInput.click();
            });
            this.avatarInput.addEventListener("change", (e) => this.handleAvatarUpload(e));
        }

        if (this.dashboardBtn && this.dashboardMenu) {
            this.dashboardBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = this.dashboardMenu.style.display === "block";
                this.dashboardMenu.style.display = isOpen ? "none" : "block";
                this.dashboardBtn.innerHTML = isOpen ? "Dashboard ▼" : "Dashboard ▲";
            });
        }

        if (this.logoutBtn) {
            this.logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(this.logoutModal) this.logoutModal.classList.add("active");
            });
        }

        if (this.cancelLogout) {
            this.cancelLogout.addEventListener("click", (e) => {
                e.stopPropagation();
                if(this.logoutModal) this.logoutModal.classList.remove("active");
            });
        }

        if (this.confirmLogout) {
            this.confirmLogout.addEventListener("click", () => this.logout());
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.close();
        });
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const employeeId = localStorage.getItem("userId");
        if (!employeeId) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
        
        try {
            let formData = new FormData();
            formData.append('', file);

            const uploadRes = await fetch(`${SB_URL}/storage/v1/object/avatars/${fileName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SB_KEY}`,
                    'apikey': SB_KEY
                },
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Gagal menyimpan gambar ke pelayan storage.");

            const publicUrl = `${SB_URL}/storage/v1/object/public/avatars/${fileName}`;

            if (employeeId === "@dm1n") {
                localStorage.setItem("staff_avatar", publicUrl);
                alert("✅ Gambar profil Admin berjaya dikemas kini!");
                window.location.reload();
                return;
            }

            const updateRes = await fetch(`${SB_URL}/rest/v1/staff?employee_id=eq.${encodeURIComponent(employeeId)}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${SB_KEY}`,
                    'apikey': SB_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ avatar_url: publicUrl })
            });

            if (!updateRes.ok) throw new Error("Gagal mengemaskini maklumat profil di pangkalan data.");

            localStorage.setItem("staff_avatar", publicUrl);
            alert("✅ Gambar profil berjaya dikemas kini!");
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("Ralat: " + err.message);
        }
    }

    toggle() {
        const isOpen = this.sidebar.classList.toggle("active");
        if(this.overlay) this.overlay.classList.toggle("active");
        if(this.checkbox) this.checkbox.checked = isOpen;
    }

    close() {
        if(this.sidebar) this.sidebar.classList.remove("active");
        if(this.overlay) this.overlay.classList.remove("active");
        if(this.checkbox) this.checkbox.checked = false;
    }

    logout() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("login.html");
    }
}

customElements.define("app-sidebar", AppSidebar);

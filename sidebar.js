// 🌟 Masukkan kredensial Supabase anda di sini supaya fungsi upload berfungsi
const SB_URL = "https://ywmsvowroxzhrjwrhsru.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXN2b3dyb3h6aHJqd3Joc3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDU5MzcsImV4cCI6MjA4Nzg4MTkzN30.OHJ-I_T3QID8y8eaoOBWeG2nKd2FhHfzG4P515Rzfks";

class AppSidebar extends HTMLElement {
    connectedCallback() {
        // 1. Ambil data nama, posisi, dan URL avatar staf daripada localStorage
        const staffName = localStorage.getItem("staff_name") || "USER";
        const staffRole = localStorage.getItem("role") || "STAFF";
        const staffAvatar = localStorage.getItem("staff_avatar") || ""; 

        // 2. Sistem sandaran pintar: Jika tiada gambar, paparkan huruf pertama nama staf
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
                    <a href="#" class="menu-parent" id="dashboardBtn">
                        Dashboard ▼
                    </a>
                    
                    <div class="submenu" id="dashboardMenu" style="display:none;">
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

        // Cache untuk elemen avatar upload baru
        this.avatarWrapper = this.querySelector("#avatarClickable");
        this.avatarInput = this.querySelector("#avatarInput");
    }

    bindEvents() {
        this.btn.addEventListener("click", () => this.toggle());
        this.overlay.addEventListener("click", () => this.close());

        // Logik Klik pada bulatan avatar untuk buka fail picker
        if (this.avatarWrapper && this.avatarInput) {
            this.avatarWrapper.addEventListener("click", () => {
                this.avatarInput.click();
            });

            // Jalankan fungsi hantar imej apabila fail dipilih
            this.avatarInput.addEventListener("change", (e) => this.handleAvatarUpload(e));
        }

        if(this.dashboardBtn && this.dashboardMenu) {
            this.dashboardBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const isOpen = this.dashboardMenu.style.display === "block";
                this.dashboardMenu.style.display = isOpen ? "none" : "block";
                this.dashboardBtn.innerHTML = isOpen ? "Dashboard ▼" : "Dashboard ▲";
            });
        }

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

    // Fungsi automatik menguruskan muat naik ke Supabase Storage & Database
    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const employeeId = localStorage.getItem("userId");
        if (!employeeId || employeeId === "@dm1n") {
            alert("Ralat: Akaun pentadbir sistem am tidak boleh menukar gambar profil melalui kaedah ini.");
            return;
        }

        // Generate nama fail unik berasaskan ID Pekerja untuk mengelakkan pertindihan cache
        const fileExt = file.name.split('.').pop();
        const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
        
        try {
            // 1. Kirim imej ke Supabase Storage Bucket bernama 'avatars'
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

            // 2. Bina pautan URL awam (Public URL)
            const publicUrl = `${SB_URL}/storage/v1/object/public/avatars/${fileName}`;

            // 3. Kemas kini data lajur 'avatar_url' dalam jadual 'staff'
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

            // 4. Set nilai baharu di localStorage dan segarkan halaman secara automatik
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
        const section = localStorage.getItem("current_section") || "GENERAL";
        window.location.href = `dashboard-contract.html?section=${encodeURIComponent(section)}`;
    }
}

customElements.define("app-sidebar", AppSidebar);

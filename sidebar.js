class AppSidebar extends HTMLElement {
    connectedCallback(){
        this.innerHTML = `
<div class="overlay" id="overlay"></div>

<div class="sidebar" id="sidebar">
    <h3>M&E Menu</h3>

    <a href="sections.html"> Home</a>
    <a href="#" id="dashboardBtn"> Dashboard</a>
    <a href="#" id="logoutBtn"> Logout</a>
</div>

<div class="hamburger" id="hamburger">☰</div>
`;

        this.init();
    }

    init(){
        const sidebar = this.querySelector("#sidebar");
        const overlay = this.querySelector("#overlay");
        const btn = this.querySelector("#hamburger");

        const toggle = () => {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        };
const logoutBtn = this.querySelector("#logoutBtn");

logoutBtn.onclick = (e) => {
    e.preventDefault();

    // clear session / storage (kalau ada)
    localStorage.removeItem("me_user");
    sessionStorage.clear();

    window.location.href = "login.html";
};
const dashboardBtn = this.querySelector("#dashboardBtn");

dashboardBtn.onclick = (e) => {
    e.preventDefault();

    // contoh default section (boleh ubah ikut app state)
    const section = localStorage.getItem("current_section") || "GENERAL";

    window.location.href = `dashboard-contract.html?section=${encodeURIComponent(section)}`;
};

        btn.onclick = toggle;
        overlay.onclick = toggle;
    }
}

customElements.define("app-sidebar", AppSidebar);
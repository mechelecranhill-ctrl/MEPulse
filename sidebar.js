class AppSidebar extends HTMLElement {
    connectedCallback(){
        this.innerHTML = `
        <div class="overlay" id="overlay"></div>

        <div class="sidebar" id="sidebar">
            <h3>M&E Menu</h3>

            <a href="index.html">🏠 Home</a>
            <a href="sections.html">📁 Sections</a>
            <a href="settings.html">⚙ Settings</a>
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

        btn.onclick = toggle;
        overlay.onclick = toggle;
    }
}

customElements.define("app-sidebar", AppSidebar);
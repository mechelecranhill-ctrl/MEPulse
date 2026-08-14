/* ==========================================================
   ROUTER (hash based, no build step needed)

   Routes:
     #/sections               -> Department Sections wheel
     #/contract?section=ID    -> Contract Dashboard (optionally
                                  pre-filtered to one section,
                                  same as old ?section=X query)

   Anything else (dashboard-usageschedule.html, contract-forms.html,
   contract-closing.html, login.html, app-tech/exec/sect/dept.html)
   is NOT part of this SPA and keeps working exactly as before via
   normal <a href="..."> full navigation.
   ========================================================== */
import { initSectionsView, destroySectionsView } from './view-sections.js';
import { initContractView, destroyContractView } from './view-contract.js';

const appEl = document.getElementById('app');

const routes = {
    sections: { file: 'views/sections.html', init: initSectionsView, destroy: destroySectionsView },
    contract: { file: 'views/contract.html', init: initContractView, destroy: destroyContractView }
};

let currentRoute = null;
const viewCache = {};

function parseHash() {
    const raw = window.location.hash.slice(1) || '/sections';
    const [path, query] = raw.split('?');
    const name = path.replace(/^\/+/, '') || 'sections';
    const params = new URLSearchParams(query || '');
    return { name: routes[name] ? name : 'sections', params };
}

async function loadViewHtml(name) {
    if (viewCache[name]) return viewCache[name];
    const res = await fetch(routes[name].file);
    const html = await res.text();
    viewCache[name] = html;
    return html;
}

async function renderRoute() {
    const { name, params } = parseHash();
    const route = routes[name];

    if (currentRoute && typeof currentRoute.destroy === 'function') {
        try { currentRoute.destroy(); } catch (e) { console.error(e); }
    }

    appEl.innerHTML = await loadViewHtml(name);
    appEl.className = 'view-root view-' + name;

    if (typeof window.checkSession === 'function') {
        try { await window.checkSession(); } catch (e) { console.error(e); }
    }

    route.init(appEl, params);
    currentRoute = route;

    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.toggle('active-nav', el.dataset.nav === name);
    });
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('DOMContentLoaded', renderRoute);

/* Global helper so sidebar.js (a plain, non-module script) and
   the dynamically injected view HTML can navigate SPA-style
   instead of doing a full page reload. */
window.appNavigate = function (hash) {
    if (!hash.startsWith('#')) hash = '#' + (hash.startsWith('/') ? hash : '/' + hash);
    if (window.location.hash === hash) {
        renderRoute();
    } else {
        window.location.hash = hash;
    }
};

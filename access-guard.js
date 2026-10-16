(function () {
    const protect = !!(document.currentScript && document.currentScript.hasAttribute('data-protect'));
    if (protect && localStorage.getItem('sessionExpired') !== 'true') {
        document.documentElement.style.visibility = 'hidden';
    }

    const ALLOWED_SECTIONS = ['SEKSYEN SELENGGARA', 'SEKSYEN PEMATUHAN PERATURAN'];
    const CACHE_TTL = 60 * 60 * 1000;

    const hdrs = () => (typeof apiHeaders !== 'undefined' ? apiHeaders : { 'Content-Type': 'application/json' });

    async function q(table, query) {
        const r = await fetch(`${API_URL}/rest/v1/${table}?${query}`, { headers: hdrs() });
        if (!r.ok) throw new Error(`${table} gagal (${r.status})`);
        return r.json();
    }

    const inList = (arr) => `in.(${arr.join(',')})`;

    async function getAccess() {
        const staffId = Number(localStorage.getItem('staff_id'));
        const isAdmin = localStorage.getItem('userId') === '@dm1n' || localStorage.getItem('role') === 'admin';
        const key = `acl:${staffId}`;

        if (localStorage.getItem('loggedIn') !== 'true') { sessionStorage.removeItem(key); return { isAdmin: false, isDeptHead: false, isSectionHead: false, unitIds: [], sectionNames: [] }; }

        try {
            const c = JSON.parse(sessionStorage.getItem(key) || 'null');
            if (c && Date.now() - c.t < CACHE_TTL) return c.v;
        } catch (e) {}

        const v = { isAdmin, isDeptHead: false, isSectionHead: false, unitIds: [], sectionNames: [] };

        if (!isAdmin) {
            if (!staffId || Number.isNaN(staffId)) return v;

            const [staffRows, dept, unitAs, secAs] = await Promise.all([
                q('staff', `id=eq.${staffId}&select=position`),
                q('department_head', `staff_id=eq.${staffId}&active=eq.true&select=staff_id`),
                q('staff_unit_assignment', `staff_id=eq.${staffId}&active=eq.true&select=unit_id`),
                q('staff_section_assignment', `staff_id=eq.${staffId}&active=eq.true&select=section_id`)
            ]);

            const pos = (staffRows[0]?.position || '').trim().toUpperCase();
            v.isDeptHead = pos === 'KETUA JABATAN' || dept.length > 0;
            v.isSectionHead = pos === 'KETUA SEKSYEN' || secAs.length > 0;

            const unitIds = new Set(unitAs.map(a => a.unit_id));
            const sectionIds = new Set(secAs.map(a => a.section_id));

            if (unitIds.size) {
                const us = await q('units', `id=${inList([...unitIds])}&select=id,section_id`);
                us.forEach(u => u.section_id && sectionIds.add(u.section_id));
            }
            if (v.isSectionHead && sectionIds.size) {
                const us = await q('units', `section_id=${inList([...sectionIds])}&select=id`);
                us.forEach(u => unitIds.add(u.id));
            }
            if (sectionIds.size) {
                const secs = await q('me_sections', `id=${inList([...sectionIds])}&select=section_name`);
                v.sectionNames = secs.map(s => (s.section_name || '').trim().toUpperCase());
            }
            v.unitIds = [...unitIds].map(String);
        }

        sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
        return v;
    }

    function isAllowed(a) {
        return a.isAdmin || a.isDeptHead || a.sectionNames.some(n => ALLOWED_SECTIONS.includes(n));
    }

    function showPopup(message) {
        return new Promise((resolve) => {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes agFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes agPopIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            `;
            document.head.appendChild(style);

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:999999;animation:agFadeIn 0.2s ease-out;';

            const box = document.createElement('div');
            box.style.cssText = 'background:#ffffff;padding:28px 24px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);width:100%;max-width:360px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;animation:agPopIn 0.25s cubic-bezier(0.16,1,0.3,1);box-sizing:border-box;margin:16px;';

            const iconContainer = document.createElement('div');
            iconContainer.style.cssText = 'width:56px;height:56px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;';
            iconContainer.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

            const title = document.createElement('h3');
            title.style.cssText = 'margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;';
            title.textContent = 'Access Restricted';

            const msg = document.createElement('p');
            msg.style.cssText = 'margin:0 0 24px 0;font-size:14px;color:#64748b;line-height:1.5;';
            msg.textContent = message;

            const btn = document.createElement('button');
            btn.style.cssText = 'width:100%;background:#2563eb;color:#ffffff;border:none;padding:10px 16px;font-size:14px;border-radius:8px;cursor:pointer;font-weight:500;transition:background 0.2s;outline:none;';
            btn.textContent = 'Understand';

            btn.onmouseover = () => btn.style.background = '#1d4ed8';
            btn.onmouseout = () => btn.style.background = '#2563eb';

            btn.onclick = () => {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
                resolve();
            };

            box.appendChild(iconContainer);
            box.appendChild(title);
            box.appendChild(msg);
            box.appendChild(btn);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        });
    }

    async function requireAllowedSection() {
        try {
            const a = await getAccess();
            if (isAllowed(a)) { document.documentElement.style.visibility = ''; return true; }
        } catch (e) { console.error('Access authorisation failed:', e); }
        document.documentElement.style.visibility = '';
        await showPopup('You do not have access to this page.');
        window.location.replace('dashboard-contract.html');
        return false;
    }

    async function filterUnits(allUnits) {
        const a = await getAccess();
        if (a.isAdmin || a.isDeptHead) return allUnits;
        const own = new Set(a.unitIds);
        return allUnits.filter(u => own.has(String(u.id)));
    }

    window.AccessGuard = { getAccess, isAllowed, requireAllowedSection, filterUnits, ALLOWED_SECTIONS };
})();

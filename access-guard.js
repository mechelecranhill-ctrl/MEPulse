/* access-guard.js
 * Muat SELEPAS session.js, SEBELUM script page.
 * Digunakan oleh: contract-forms, app-tech, app-exec, app-sect, app-dept
 */
(function () {
    // Sembunyikan page supaya kandungan tidak "flash" sebelum semakan siap.
    // Jangan sembunyikan jika sesi dah tamat, supaya modal "Session Expired" (session.js) kelihatan.
    // Hanya untuk page yang dilindungi: <script src="access-guard.js" data-protect></script>
    // Page biasa (cth sections.html) boleh muat tanpa data-protect untuk guna AccessGuard.getAccess() sahaja.
    const protect = !!(document.currentScript && document.currentScript.hasAttribute('data-protect'));
    if (protect && localStorage.getItem('sessionExpired') !== 'true') {
        document.documentElement.style.visibility = 'hidden';
    }

    const ALLOWED_SECTIONS = ['SEKSYEN SELENGGARA', 'SEKSYEN PEMATUHAN PERATURAN'];
    const CACHE_TTL = 60 * 60 * 1000; // 1 jam (sessionStorage dikosongkan semasa logout)

    // apiHeaders diisytihar dengan const dalam page (bukan window.apiHeaders), jadi guna typeof
    const hdrs = () => (typeof apiHeaders !== 'undefined' ? apiHeaders : { 'Content-Type': 'application/json' });

    async function q(table, query) {
        const r = await fetch(`${API_URL}/rest/v1/${table}?${query}`, { headers: hdrs() });
        if (!r.ok) throw new Error(`${table} gagal (${r.status})`);
        return r.json();
    }

    const inList = (arr) => `in.(${arr.join(',')})`;

    // Bina konteks akses: admin/ketua jabatan, senarai unit & seksyen milik staf
    async function getAccess() {
        const staffId = Number(localStorage.getItem('staff_id'));
        const isAdmin = localStorage.getItem('userId') === '@dm1n' || localStorage.getItem('role') === 'admin';
        const key = `acl:${staffId}`;

        // clearAuthStates() dalam session.js tak kosongkan sessionStorage, jadi buang cache lama di sini
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

            // Seksyen bagi unit yang ditugaskan
            if (unitIds.size) {
                const us = await q('units', `id=${inList([...unitIds])}&select=id,section_id`);
                us.forEach(u => u.section_id && sectionIds.add(u.section_id));
            }
            // Ketua seksyen: semua unit dalam seksyennya
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

    // Boleh akses jika admin / ketua jabatan / ahli salah satu seksyen dibenarkan
    function isAllowed(a) {
        return a.isAdmin || a.isDeptHead || a.sectionNames.some(n => ALLOWED_SECTIONS.includes(n));
    }

    // Panggil di awal init page. Return false jika ditolak (page akan redirect).
    async function requireAllowedSection() {
        try {
            const a = await getAccess();
            if (isAllowed(a)) { document.documentElement.style.visibility = ''; return true; }
        } catch (e) { console.error('Semakan akses gagal:', e); }
        document.documentElement.style.visibility = '';
        alert('Anda tidak mempunyai akses ke halaman ini.');
        window.location.replace('sections.html');
        return false;
    }

    // Tapis senarai unit (objek {id, unit_name, ...}) mengikut akses staf
    async function filterUnits(allUnits) {
        const a = await getAccess();
        if (a.isAdmin || a.isDeptHead) return allUnits;
        const own = new Set(a.unitIds);
        return allUnits.filter(u => own.has(String(u.id)));
    }

    window.AccessGuard = { getAccess, isAllowed, requireAllowedSection, filterUnits, ALLOWED_SECTIONS };
})();

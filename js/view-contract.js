/* ==========================================================
   VIEW: CONTRACT DASHBOARD 

   Adapted 1:1 from the original dashboard-contract.html inline
   <script>. Differences from the original, purely to make it
   safe to mount/unmount repeatedly inside the SPA:
     - API_URL comes from window.API_URL (js/config.js) instead
       of a local "var API_URL" (that used to clash with
       sections' own declaration once both were on one page).
     - The "?section=" filter now comes from the SPA route's
       query params (passed in by the router) instead of
       window.location.search.
     - document.body.classList("analysis-active") is now
       toggled on the view root, matching
       #app.view-contract.analysis-active in css/contract.css.
     - Functions referenced from inline HTML (onclick="...") in
       dynamically generated markup, or in the static view
       fragment, are exposed on window so they keep working;
       static-fragment buttons (fab, mobile usage, usage-schedule,
       manage) are wired with addEventListener instead in init().
     - All listeners added in initContractView() are removed in
       destroyContractView(), and both Chart.js instances are
       destroyed, so switching views doesn't leak charts/handlers.
   ========================================================== */

const API_URL = window.API_URL;
const headers = { 'Content-Type': 'application/json' };

let root;
let myChart = null;
let usageChartInstance = null;

let currentContract = null;
let currentWO = [];
let currentInterims = [];
let selectedSections = [];
let searchTimeout = null;

let cacheContracts = {};
let cacheAnalysis = {};
let usageLoadedContractId = null;

let selectedSectionName = null;

/* DOM refs (re-queried every init since the fragment is re-injected each mount) */
let fabBtn, unitNav, contractSearchInput, contractListEl, analysisPanel,
    panelTitle, panelVendor, mobileUsageBtn, manageBtn, usageScheduleBtn,
    flipCardBack;

/* handler refs for cleanup */
let onDocClickOutside, onAnalysisPanelClick, onFabClick, onMobileUsageClick,
    onManageBtnClick, onUsageScheduleClick, onSearchKeyup, onSidebarTouchStart, onSidebarTouchEnd;

let touchStartX = 0;
let touchEndX = 0;

export async function initContractView(container, params) {
    root = container;

    if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    /* reset per-mount state */
    myChart = null;
    usageChartInstance = null;
    currentContract = null;
    currentWO = [];
    currentInterims = [];
    selectedSections = [];
    cacheContracts = {};
    cacheAnalysis = {};
    usageLoadedContractId = null;
    selectedSectionName = params ? params.get('section') : null;

    fabBtn = root.querySelector('#fabBtn');
    unitNav = root.querySelector('#unitNav');
    contractSearchInput = root.querySelector('#contractSearch');
    contractListEl = root.querySelector('#contractList');
    analysisPanel = root.querySelector('#analysis-panel');
    panelTitle = root.querySelector('#panel-title');
    panelVendor = root.querySelector('#panel-vendor');
    mobileUsageBtn = root.querySelector('#mobileUsageBtn');
    manageBtn = root.querySelector('#manageBtn');
    usageScheduleBtn = root.querySelector('#usageScheduleBtn');
    flipCardBack = root.querySelector('#flipCardBack');

    updateAdminUI();

    onSearchKeyup = () => debouncedFilterContracts();
    contractSearchInput.addEventListener('keyup', onSearchKeyup);

    onFabClick = (e) => handleFabClick(e);
    fabBtn.addEventListener('click', onFabClick);

    onMobileUsageClick = (e) => handleMobileUsageClick(e);
    mobileUsageBtn.addEventListener('click', onMobileUsageClick);

    onManageBtnClick = () => toggleSelector();
    manageBtn.addEventListener('click', onManageBtnClick);

    onUsageScheduleClick = () => goToUsage();
    usageScheduleBtn.addEventListener('click', onUsageScheduleClick);

    onAnalysisPanelClick = function (e) {
        if (e.target.closest('#mobileUsageBtn') || e.target.closest('#manageBtn') || e.target.closest('#sectionSelector')) {
            return;
        }
        const isFlippingToBack = !analysisPanel.classList.contains('flipped');
        analysisPanel.classList.toggle('flipped');
        if (isFlippingToBack) loadUsageEmbedded();
    };
    analysisPanel.addEventListener('click', onAnalysisPanelClick);

    onDocClickOutside = (e) => {
        if (mobileUsageBtn && mobileUsageBtn.classList.contains('expanded')) {
            if (!mobileUsageBtn.contains(e.target)) mobileUsageBtn.classList.remove('expanded');
        }
        if (fabBtn && fabBtn.classList.contains('expanded')) {
            if (!fabBtn.contains(e.target)) fabBtn.classList.remove('expanded');
        }
    };
    document.addEventListener('click', onDocClickOutside);

    const contractSidebar = root.querySelector('.contract-sidebar');
    if (contractSidebar) {
        onSidebarTouchStart = (e) => { touchStartX = e.changedTouches[0].screenX; };
        onSidebarTouchEnd = (e) => { touchEndX = e.changedTouches[0].screenX; handleUnitSwipe(); };
        contractSidebar.addEventListener('touchstart', onSidebarTouchStart, { passive: true });
        contractSidebar.addEventListener('touchend', onSidebarTouchEnd, { passive: true });
    }

    /* expose functions referenced from dynamically generated inline HTML */
    window.fetchContracts = fetchContracts;
    window.toggleSection = toggleSection;
    window.debouncedFilterContracts = debouncedFilterContracts;

    await fetchUnits();
}

export function destroyContractView() {
    if (contractSearchInput) contractSearchInput.removeEventListener('keyup', onSearchKeyup);
    if (fabBtn) fabBtn.removeEventListener('click', onFabClick);
    if (mobileUsageBtn) mobileUsageBtn.removeEventListener('click', onMobileUsageClick);
    if (manageBtn) manageBtn.removeEventListener('click', onManageBtnClick);
    if (usageScheduleBtn) usageScheduleBtn.removeEventListener('click', onUsageScheduleClick);
    if (analysisPanel) analysisPanel.removeEventListener('click', onAnalysisPanelClick);
    document.removeEventListener('click', onDocClickOutside);

    const contractSidebar = root ? root.querySelector('.contract-sidebar') : null;
    if (contractSidebar) {
        contractSidebar.removeEventListener('touchstart', onSidebarTouchStart);
        contractSidebar.removeEventListener('touchend', onSidebarTouchEnd);
    }

    if (myChart) { myChart.destroy(); myChart = null; }
    if (usageChartInstance) { usageChartInstance.destroy(); usageChartInstance = null; }
}

function updateAdminUI() {
    if (manageBtn) manageBtn.style.display = 'inline-block';
}

function debouncedFilterContracts() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterContracts, 150);
}

function filterContracts() {
    if (!contractSearchInput) return;
    const query = contractSearchInput.value.toLowerCase();
    const cards = root.querySelectorAll('.c-card');

    requestAnimationFrame(() => {
        cards.forEach(card => {
            const code = card.querySelector('h4')?.innerText.toLowerCase() || '';
            const name = card.querySelector('.sub-text')?.innerText.toLowerCase() || '';
            card.style.display = (code.includes(query) || name.includes(query)) ? 'block' : 'none';
        });
    });
}

async function fetchUnits() {
    try {
        const [secRes, unitsRes] = await Promise.all([
            fetch(`${API_URL}/rest/v1/me_sections?select=id`, { headers }),
            fetch(`${API_URL}/rest/v1/units?select=id,unit_name,section_id`, { headers })
        ]);

        if (!secRes.ok) throw new Error(`Sections HTTP ${secRes.status}`);
        if (!unitsRes.ok) throw new Error(`Units HTTP ${unitsRes.status}`);

        const sections = await secRes.json();
        const units = await unitsRes.json();

        let selectedSection = null;
        if (selectedSectionName) {
            selectedSection = sections.find(s => s.id == selectedSectionName);
        }

        const filteredUnits = selectedSection ? units.filter(u => u.section_id === selectedSection.id) : units;

        unitNav.innerHTML = filteredUnits.map(u => `
            <button class="unit-pill" id="unit-${u.id}" onclick="fetchContracts(${u.id}, this)">
                ${u.unit_name}
            </button>
        `).join('');

        if (filteredUnits.length > 0) {
            root.querySelector(`#unit-${filteredUnits[0].id}`).click();
        }

    } catch (e) {
        console.error("Error units:", e);
    }
}

async function fetchContracts(unitId, btn) {
    root.querySelectorAll('.unit-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    centerActiveUnit(btn);

    contractSearchInput.value = '';
    root.classList.remove('analysis-active');

    analysisPanel.style.display = 'none';
    analysisPanel.classList.remove('flipped');

    currentContract = null;
    currentWO = [];
    currentInterims = [];
    selectedSections = [];
    usageLoadedContractId = null;

    panelTitle.innerText = 'Analisis';
    panelVendor.innerText = '';

    if (cacheContracts[unitId]) {
        renderContractList(cacheContracts[unitId]);
        return;
    }

    try {
        const res = await fetch(
            `${API_URL}/rest/v1/contract` +
            `?unit_id=eq.${unitId}` +
            `&select=` +
            `id,contract_code,contract_name,` +
            `contract_start,contract_end,` +
            `contract_sum,` +
            `selected_sections,` +
            `contract_sections_breakdown`,
            { headers }
        );

        if (!res.ok) throw new Error(`Contracts HTTP ${res.status}`);

        let data = await res.json();

        data.sort((a, b) => {
            const dateDiff = new Date(a.contract_start) - new Date(b.contract_start);
            if (dateDiff !== 0) return dateDiff;
            return a.contract_code.localeCompare(b.contract_code, undefined, { numeric: true, sensitivity: "base" });
        });

        cacheContracts[unitId] = data;
        renderContractList(data);

    } catch (e) {
        console.error("Error contracts:", e);
    }
}

function renderContractList(data) {
    contractListEl.innerHTML = data.map(c => `
        <div class="c-card" id="card-${c.id}">
            <h4>${c.contract_code}</h4>
            <div class="sub-text">${c.contract_name}</div>
        </div>
    `).join('');

    data.forEach(c => {
        const cardEl = root.querySelector(`#card-${c.id}`);
        if (cardEl) {
            cardEl.addEventListener('click', () => {
                selectCard(c.id);
                openAnalysis(c);
            });
        }
    });

    if (data.length > 0 && window.innerWidth > 768) {
        selectCard(data[0].id);
        openAnalysis(data[0]);
    }
}

function selectCard(id) {
    const currentActive = root.querySelector('.c-card.active');
    if (currentActive) currentActive.classList.remove('active');

    const activeCard = root.querySelector(`#card-${id}`);
    if (activeCard) activeCard.classList.add('active');
}

async function openAnalysis(contract) {
    if (mobileUsageBtn) mobileUsageBtn.classList.remove('expanded');

    analysisPanel.classList.remove('flipped');
    usageLoadedContractId = null;

    root.classList.add('analysis-active');
    analysisPanel.style.display = 'block';

    panelTitle.innerText = contract.contract_code;
    panelVendor.innerText = contract.contract_name;

    currentContract = contract;

    if (cacheAnalysis[contract.id]) {
        currentWO = cacheAnalysis[contract.id].wo;
        currentInterims = cacheAnalysis[contract.id].interims;

        selectedSections = (currentContract.selected_sections && currentContract.selected_sections.length > 0)
            ? [...currentContract.selected_sections]
            : Object.keys(currentContract.contract_sections_breakdown || {});

        renderUI(currentInterims);
        return;
    }

    currentWO = [];
    currentInterims = [];

    try {
        const [resW, resI] = await Promise.all([
            fetch(
                `${API_URL}/rest/v1/work_orders` +
                `?contract_id=eq.${currentContract.id}` +
                `&status=not.in.` +
                `(CANCEL,REJ,EXEC-REJ,HOS-REJ,HOD-REJ,QUOTATION,QUO-APP,QUO-REJ)` +
                `&select=interim_no,section_category,status`,
                { headers }
            ),
            fetch(
                `${API_URL}/rest/v1/interims` +
                `?contract_id=eq.${currentContract.id}` +
                `&order=date_received.asc` +
                `&select=claim_breakdown,net_amount,claim_amount,claim_date`,
                { headers }
            )
        ]);

        if (!resW.ok) throw new Error(`WO HTTP ${resW.status}`);
        if (!resI.ok) throw new Error(`Interim HTTP ${resI.status}`);

        const rawWO = await resW.json();

        currentWO = rawWO.map(wo => {
            if (wo.status && wo.status.toLowerCase() === 'claimed') wo.status = 'CLAIMED';
            return wo;
        });

        currentInterims = await resI.json();

        cacheAnalysis[contract.id] = { wo: currentWO, interims: currentInterims };

        selectedSections = (currentContract.selected_sections && currentContract.selected_sections.length > 0)
            ? [...currentContract.selected_sections]
            : Object.keys(currentContract.contract_sections_breakdown || {});

        renderUI(currentInterims);

    } catch (error) {
        console.error("Error fetching analysis data:", error);
    }
}

async function renderUI(interimsData = currentInterims) {
    if (!currentContract) return;

    try {
        updateAdminUI();

        const sections = currentContract.contract_sections_breakdown || {};
        const start = new Date(currentContract.contract_start);
        const end = new Date(currentContract.contract_end);
        const today = new Date();

        const totalMonths = Math.max(1,
            ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth())
        );

        let monthsElapsed = ((today.getFullYear() - start.getFullYear()) * 12) + (today.getMonth() - start.getMonth()) + 1;
        monthsElapsed = Math.min(totalMonths, Math.max(1, monthsElapsed));

        root.querySelector('#fullSectionList').innerHTML = Object.keys(sections).sort().map(s => `
            <span class="sel-chip ${selectedSections.includes(s) ? 'active' : ''}" onclick="toggleSection('${s}')">
                ${s}
            </span>
        `).join('');

        const mainContainer = root.querySelector('#selectedSectionContainer');
        let htmlBuilder = '';

        const interimMap = {};
        (interimsData || []).forEach(int => {
            if (!int.claim_breakdown) return;
            Object.keys(int.claim_breakdown).forEach(s => {
                interimMap[s] = (interimMap[s] || 0) + (int.claim_breakdown[s].amt || 0);
            });
        });

        const woMap = {};
        currentWO.forEach(wo => {
            if (!wo.interim_no && wo.section_category) {
                Object.keys(wo.section_category).forEach(s => {
                    woMap[s] = (woMap[s] || 0) + (wo.section_category[s].amt || 0);
                });
            }
        });

        let labels = [];
        let targetAvgData = [];
        let actualAvgData = [];

        selectedSections.sort().forEach(s => {
            if (!sections[s]) return;

            const totalInterimClaim = interimMap[s] || 0;
            const totalPendingWO = woMap[s] || 0;
            const used = totalInterimClaim + totalPendingWO;
            const budget = sections[s].amt || 0;
            const plannedTotalToDate = (budget / totalMonths) * monthsElapsed;
            const variance = used - plannedTotalToDate;
            const variancePercent = plannedTotalToDate ? (variance / plannedTotalToDate) * 100 : 0;
            const color = used > plannedTotalToDate ? 'var(--ios-red)' : 'var(--ios-green)';
            const progressPercent = budget ? (used / budget) * 100 : 0;

            labels.push(s);
            targetAvgData.push((budget / totalMonths).toFixed(2));
            actualAvgData.push((used / monthsElapsed).toFixed(2));

            htmlBuilder += `
                <div class="section-row">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="font-weight:bold; font-size:13px; color:var(--ios-blue);">
                            ${s}: ${sections[s].desc || s}
                        </div>
                    </div>

                    <div class="avg-stats">
                        <div class="avg-item">BUDGET: RM ${budget.toLocaleString()}</div>
                        <div class="avg-item" style="color:#8e8e93;">
                            PLANNED: RM ${plannedTotalToDate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>

                    <div class="avg-stats">
                        <div class="avg-item">ACTUAL: RM ${used.toLocaleString()}</div>
                        <div class="avg-item" style="color:${color};">
                            VARIANCE: ${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%
                        </div>
                    </div>

                    <div class="prog-bar-bg">
                        <div class="prog-bar-fill" data-width="${Math.min(100, progressPercent)}%" style="background:${color}"></div>
                    </div>
                </div>
            `;
        });

        mainContainer.innerHTML = htmlBuilder;

        updateChartDirect(labels, targetAvgData, actualAvgData);

        requestAnimationFrame(() => {
            root.querySelectorAll('.prog-bar-fill').forEach(bar => {
                bar.style.setProperty('width', bar.getAttribute('data-width'), 'important');
            });
        });

    } catch (error) {
        console.error("Error processing UI:", error);
    }
}

function updateChartDirect(labels, targetAvgData, actualAvgData) {
    const trimmedLabels = labels.map(label => label.replace(/^section\s*/i, ''));

    if (myChart) {
        myChart.data.labels = trimmedLabels;
        myChart.data.datasets[0].data = targetAvgData;
        myChart.data.datasets[1].data = actualAvgData;
        myChart.update('none');
        return;
    }

    const canvas = root.querySelector('#healthChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: trimmedLabels,
            datasets: [
                { label: 'Planned', data: targetAvgData, backgroundColor: 'rgba(200, 200, 205, 0.5)', borderRadius: 5 },
                { label: 'Actual', data: actualAvgData, backgroundColor: '#007AFF', borderRadius: 5 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 150 },
            layout: { padding: { bottom: 15, top: 15 } },
            plugins: {
                legend: { position: 'top', labels: { font: { size: 10, weight: 'bold' } } },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    font: { size: 9, weight: 'bold' },
                    formatter: (v) => v > 0 ? `RM${Math.round(v).toLocaleString()}` : ''
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { font: { size: 10, weight: 'bold' }, maxRotation: 0, minRotation: 0 } }
            }
        }
    });
}

async function toggleSection(s) {
    if (!currentContract) return;

    if (selectedSections.includes(s)) {
        selectedSections = selectedSections.filter(x => x !== s);
    } else {
        selectedSections.push(s);
    }

    renderUI(currentInterims);

    try {
        const res = await fetch(`${API_URL}/rest/v1/contract?id=eq.${currentContract.id}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ selected_sections: selectedSections })
        });

        if (!res.ok) throw new Error(`PATCH contract HTTP ${res.status}`);

        currentContract.selected_sections = [...selectedSections];

        Object.keys(cacheContracts).forEach(unitId => {
            const list = cacheContracts[unitId];
            if (!Array.isArray(list)) return;
            const cached = list.find(c => c.id === currentContract.id);
            if (cached) cached.selected_sections = [...selectedSections];
        });

    } catch (error) {
        console.error("Error saving selected sections:", error);
    }
}

function toggleSelector() {
    const el = root.querySelector('#sectionSelector');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function handleMobileUsageClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!mobileUsageBtn.classList.contains('expanded')) {
        mobileUsageBtn.classList.add('expanded');
    } else {
        goToUsage();
    }
}

function goToUsage() {
    if (!currentContract) {
        alert("Please choose a contract");
        return;
    }
    /* dashboard-usageschedule.html is outside this SPA's two merged
       pages, so it keeps behaving as a normal full navigation. */
    window.location.href = `dashboard-usageschedule.html?id=${currentContract.id}`;
}

function handleFabClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!fabBtn.classList.contains('expanded')) {
        if (mobileUsageBtn) mobileUsageBtn.classList.remove('expanded');
        fabBtn.classList.add('expanded');
    } else {
        window.location.href = 'contract-forms.html';
    }
}

function centerActiveUnit(btn) {
    if (window.innerWidth <= 768) {
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
}

function handleUnitSwipe() {
    if (window.innerWidth > 768) return;

    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < 60) return;

    const units = [...root.querySelectorAll('.unit-pill')];
    const activeIndex = units.findIndex(btn => btn.classList.contains('active'));
    if (activeIndex === -1) return;

    if (diff > 0 && activeIndex < units.length - 1) units[activeIndex + 1].click();
    if (diff < 0 && activeIndex > 0) units[activeIndex - 1].click();
}

function formatRM(value) {
    return "RM " + Number(value || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadUsageEmbedded() {
    if (!currentContract) return;

    const contractId = currentContract.id;
    if (usageLoadedContractId === contractId) return;

    try {
        const contract = currentContract;
        const validWorkOrders = currentWO;
        const safeInterims = currentInterims;

        root.querySelector('#uwWoCount').innerText = validWorkOrders.length.toLocaleString('en-MY');
        root.querySelector('#uwInterimCount').innerText = safeInterims.length.toLocaleString('en-MY');

        const contractValue = Number(contract.contract_sum || 0);

        const claimedAmount = safeInterims.reduce((sum, row) => sum + Number(row.net_amount || row.claim_amount || 0), 0);

        const pendingAmount = validWorkOrders.reduce((sum, wo) => {
            if (!wo.interim_no && wo.section_category) {
                const sectionTotal = Object.values(wo.section_category).reduce(
                    (s, sec) => s + Number((sec && sec.amt) || 0), 0
                );
                return sum + sectionTotal;
            }
            return sum;
        }, 0);

        const totalUsed = claimedAmount + pendingAmount;
        const balance = contractValue - totalUsed;
        const progress = contractValue ? ((totalUsed / contractValue) * 100).toFixed(1) : 0;

        root.querySelector('#uwContractValue').innerText = formatRM(contractValue);
        root.querySelector('#uwUsedValue').innerText = formatRM(totalUsed);
        root.querySelector('#uwBalanceValue').innerText = formatRM(balance);
        root.querySelector('#uwProgressValue').innerText = progress + '%';

        const monthlyMap = {};
        safeInterims.forEach(item => {
            if (!item.claim_date) return;
            const date = new Date(item.claim_date);
            if (isNaN(date.getTime())) return;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(item.net_amount || item.claim_amount || 0);
        });

        const startDate = new Date(contract.contract_start);
        const endDate = new Date(contract.contract_end);

        let totalContractMonths = 1;
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            totalContractMonths = Math.max(1,
                ((endDate.getFullYear() - startDate.getFullYear()) * 12) + (endDate.getMonth() - startDate.getMonth()) + 1
            );
        }

        let months = [];
        let actual = [];

        if (Object.keys(monthlyMap).length > 0) {
            months = Object.keys(monthlyMap).sort();
            actual = months.map(m => monthlyMap[m]);
        } else {
            months = ['Jan', 'Feb', 'Mar'];
            actual = [0, 0, 0];
        }

        const monthlyPlanned = contractValue / totalContractMonths;
        const planned = months.map(() => monthlyPlanned);

        buildUsageChart(months, planned, actual);
        buildUsageTable(months, planned, actual, Object.keys(monthlyMap).length === 0);
        updateUsageLifecycle(contract, safeInterims, validWorkOrders);

        usageLoadedContractId = contractId;

    } catch (err) {
        console.error('Ralat usage embed:', err);
    }
}

function buildUsageChart(months, planned, actual) {
    const ctx = root.querySelector('#uwChart');
    if (!ctx) return;

    if (usageChartInstance) { usageChartInstance.destroy(); usageChartInstance = null; }

    usageChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { label: 'Planned', data: planned, borderColor: '#8e8e93', borderDash: [6, 4], fill: false, tension: 0.3, pointRadius: 2 },
                { label: 'Actual', data: actual, borderColor: '#007AFF', backgroundColor: 'rgba(0,122,255,0.15)', fill: true, tension: 0.35, pointRadius: 3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 9, weight: 'bold' } } },
                datalabels: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { font: { size: 8 } } },
                x: { ticks: { font: { size: 8 } } }
            }
        }
    });
}

function buildUsageTable(months, planned, actual, noRecords = false) {
    const body = root.querySelector('#uwTableBody');
    if (!body) return;

    body.innerHTML = '';

    if (noRecords) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#8e8e93;">Tiada rekod tuntutan interim</td></tr>`;
        return;
    }

    months.forEach((m, i) => {
        const variance = (actual[i] || 0) - (planned[i] || 0);
        const color = variance > 0 ? '#FF3B30' : '#34C759';

        body.innerHTML += `
            <tr>
                <td>${formatUsageMonth(m)}</td>
                <td>${formatRM(planned[i])}</td>
                <td>${formatRM(actual[i])}</td>
                <td style="color:${color}; font-weight:700;">${formatRM(variance)}</td>
            </tr>
        `;
    });
}

function formatUsageMonth(value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
        const [year, month] = value.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        return date.toLocaleString('en-MY', { month: 'short', year: 'numeric' });
    }
    return value;
}

function updateUsageLifecycle(contract, interims, validWorkOrders = []) {
    if (!flipCardBack) return;

    const awardNode = flipCardBack.querySelector('.u-step-award');
    const woNode = flipCardBack.querySelector('.u-step-wo');
    const interimNode = flipCardBack.querySelector('.u-step-interim');
    const cpcNode = flipCardBack.querySelector('.u-step-cpc');
    const cmgdNode = flipCardBack.querySelector('.u-step-cmgd');
    const sfaNode = flipCardBack.querySelector('.u-step-sfa');

    const allNodes = [awardNode, woNode, interimNode, cpcNode, cmgdNode, sfaNode];

    allNodes.forEach(node => {
        if (!node) return;
        node.classList.remove('u-done', 'u-current');
        const dot = node.querySelector('.u-dot');
        if (dot) dot.innerHTML = `<i class="fa fa-clock"></i>`;
    });

    if (contract && awardNode) {
        awardNode.classList.add('u-done');
        const dot = awardNode.querySelector('.u-dot');
        if (dot) dot.innerHTML = `<i class="fa fa-check"></i>`;
    }

    const woCount = Array.isArray(validWorkOrders) ? validWorkOrders.length
        : Number(root.querySelector('#uwWoCount')?.innerText || 0);

    if (woNode) {
        if (woCount > 0) {
            woNode.classList.add('u-done');
            const dot = woNode.querySelector('.u-dot');
            if (dot) dot.innerHTML = `<i class="fa fa-check"></i>`;
        } else {
            woNode.classList.add('u-current');
        }
    }

    const interimCount = Array.isArray(interims) ? interims.length : 0;

    if (interimCount > 0 && interimNode) {
        interimNode.classList.add('u-current');
        const dot = interimNode.querySelector('.u-dot');
        if (dot) dot.innerHTML = `<i class="fa fa-clock"></i>`;
    }

    if (woCount === 0 && woNode) {
        woNode.classList.remove('u-done');
        woNode.classList.add('u-current');
    } else if (woCount > 0 && interimCount === 0 && interimNode) {
        interimNode.classList.add('u-current');
    }

    if (!contract || !contract.contract_end) return;

    const today = new Date();
    const endDate = new Date(contract.contract_end);
    if (isNaN(endDate.getTime())) return;

    if (today > endDate) {
        if (interimNode) {
            interimNode.classList.remove('u-current');
            interimNode.classList.add('u-done');
            const dot = interimNode.querySelector('.u-dot');
            if (dot) dot.innerHTML = `<i class="fa fa-check"></i>`;
        }
        if (cpcNode) cpcNode.classList.add('u-current');
    }

    const cmgdDate = new Date(endDate);
    cmgdDate.setMonth(cmgdDate.getMonth() + 6);

    if (today >= cmgdDate) {
        if (cpcNode) {
            cpcNode.classList.remove('u-current');
            cpcNode.classList.add('u-done');
            const dot = cpcNode.querySelector('.u-dot');
            if (dot) dot.innerHTML = `<i class="fa fa-check"></i>`;
        }
        if (cmgdNode) cmgdNode.classList.add('u-current');
    }

    const sfaDate = new Date(endDate);
    sfaDate.setMonth(sfaDate.getMonth() + 18);

    if (today >= sfaDate) {
        if (cpcNode) {
            cpcNode.classList.remove('u-current');
            cpcNode.classList.add('u-done');
            const cpcDot = cpcNode.querySelector('.u-dot');
            if (cpcDot) cpcDot.innerHTML = `<i class="fa fa-check"></i>`;
        }
        if (cmgdNode) {
            cmgdNode.classList.remove('u-current');
            cmgdNode.classList.add('u-done');
            const cmgdDot = cmgdNode.querySelector('.u-dot');
            if (cmgdDot) cmgdDot.innerHTML = `<i class="fa fa-check"></i>`;
        }
        if (sfaNode) sfaNode.classList.add('u-current');
    }
}

/* ==========================================================
   VIEW: SECTIONS (Department Sections wheel)

   Adapted 1:1 from the original sections.html inline <script>.
   Differences from the original, purely to make it safe to
   mount/unmount repeatedly inside the SPA:
     - API_URL now comes from window.API_URL (js/config.js)
       instead of being re-declared here.
     - document.body.classList (bg-maint / hide-wheel) is now
       toggled on the view root element instead, matching the
       #app.view-sections selectors in css/sections.css.
     - window.location.href to the old dashboard-contract.html
       is replaced by window.appNavigate() (SPA route change).
     - all window/document-level listeners are attached in
       initSectionsView() and detached in destroySectionsView()
       so navigating away and back doesn't stack up duplicate
       handlers.
   ========================================================== */

const API_URL = window.API_URL;

let root, wheel, title, card, cardTitle, cardDesc, openBtn, prevBtn, nextBtn;
let detailPanel, detailPanelTitle, detailList, detailBackBtn;

let isMobile = false;
let radius;
let index = 0;
let baseAngle = 0;
let stepAngle = 0;
let lock = false;
let items = [];
let itemEls = [];
let currentFloating = null;
let activeSection = "";

let contractClaimCache = {};
let contractPSumKeyCache = {};
let allWorkOrdersCache = null;
let allInterimsCache = null;

let currentLists = { ongoing: [], renewal: [], cpc: [], risk: [] };

let buffer = 0;
let startX = 0;

/* Handler references kept so they can be removed on destroy */
let onWheelScroll, onTouchStart, onTouchEnd, onDocClick, onKeyDown, onPrevClick, onNextClick, onDetailBack;

export async function initSectionsView(container) {
    root = container;

    wheel = root.querySelector("#wheel");
    title = root.querySelector("#title");
    card = root.querySelector("#infoCard");
    cardTitle = root.querySelector("#cardTitle");
    cardDesc = root.querySelector("#cardDesc");
    openBtn = root.querySelector("#openBtn");
    prevBtn = root.querySelector("#prevBtn");
    nextBtn = root.querySelector("#nextBtn");
    detailPanel = root.querySelector("#detailPanel");
    detailPanelTitle = root.querySelector("#detailPanelTitle");
    detailList = root.querySelector("#detailList");
    detailBackBtn = root.querySelector("#detailBackBtn");

    isMobile = window.innerWidth <= 768;
    radius = isMobile ? 180 : Math.min(Math.max(window.innerWidth * 0.16, 240), 340);

    index = 0;
    baseAngle = 0;
    lock = false;
    items = [];
    itemEls = [];
    currentFloating = null;
    activeSection = "";
    currentLists = { ongoing: [], renewal: [], cpc: [], risk: [] };
    buffer = 0;

    onPrevClick = () => prev();
    onNextClick = () => next();
    onDetailBack = (e) => { e.stopPropagation(); closeDetail(); };

    prevBtn.addEventListener("click", onPrevClick);
    nextBtn.addEventListener("click", onNextClick);
    detailBackBtn.addEventListener("click", onDetailBack);

    openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!activeSection) { alert("Please select a section first."); return; }
        window.appNavigate(`/contract?section=${activeSection.id}`);
    });

    onWheelScroll = (e) => {
        if (lock) return;
        lock = true;
        buffer += e.deltaY;
        if (buffer > 80) { next(); buffer = 0; }
        if (buffer < -80) { prev(); buffer = 0; }
        setTimeout(() => lock = false, 120);
    };
    window.addEventListener("wheel", onWheelScroll, { passive: true });

    const isCardOpen = () => card.classList.contains("show-mobile");

    onTouchStart = (e) => {
        if (isCardOpen()) return;
        startX = e.touches[0].clientX;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    onTouchEnd = (e) => {
        if (isCardOpen()) return;
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) < 40) return;
        if (diff > 0) next(); else prev();
    };
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    onDocClick = (e) => {
        if (!isMobile) return;
        if (!card.contains(e.target) && !e.target.closest(".item") && e.target.id !== "openBtn") {
            card.classList.remove("show-mobile");
            root.classList.remove("hide-wheel");
            dismissFloating();
            closeDetail();
        }
    };
    document.addEventListener("click", onDocClick);

    onKeyDown = (e) => {
        if (e.key === "Escape") closeDetail();
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
    };
    window.addEventListener("keydown", onKeyDown);

    /* exposed for the dynamically generated status-row onclick="openDetail('ongoing')" */
    window.openDetail = openDetail;

    await loadSections();
}

export function destroySectionsView() {
    if (prevBtn) prevBtn.removeEventListener("click", onPrevClick);
    if (nextBtn) nextBtn.removeEventListener("click", onNextClick);
    if (detailBackBtn) detailBackBtn.removeEventListener("click", onDetailBack);
    window.removeEventListener("wheel", onWheelScroll);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("click", onDocClick);
    window.removeEventListener("keydown", onKeyDown);
    dismissFloating();
}

/* ==========================================================
   CLOUDFLARE WORKER (me-connect-api) fetch helpers — unchanged
   ========================================================== */
async function fetchAllRows(url) {
    let all = [];
    let lastId = 0;
    const pageSize = 1000;
    const sep = url.includes("?") ? "&" : "?";

    while (true) {
        const pagedUrl = `${url}${sep}id=gt.${lastId}&order=id.asc&limit=${pageSize}`;
        const res = await fetch(pagedUrl);
        const chunk = await res.json();
        if (!Array.isArray(chunk) || chunk.length === 0) break;
        all = all.concat(chunk);
        lastId = chunk[chunk.length - 1].id;
        if (chunk.length < pageSize) break;
    }
    return all;
}

function formatRM(value) {
    return "RM " + Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function findProvisionalSumKey(breakdown) {
    if (!breakdown) return null;
    return Object.keys(breakdown).find(k => {
        const item = breakdown[k];
        if (typeof item === 'object' && item.desc) {
            return item.desc.toUpperCase().trim() === "PROVISIONAL SUM";
        }
        return false;
    });
}

function getProvisionalSumBalance(c) {
    const breakdown = c.contract_sections_breakdown || {};
    const cache = contractClaimCache[c.id] || { interimUsed: {}, woUsed: {} };
    const voBreakdown = c.vo_breakdown || {};

    const pSumKey = findProvisionalSumKey(breakdown);
    if (!pSumKey) return { budget: 0, used: 0, balance: 0 };

    const keyUpper = pSumKey.toUpperCase().trim();
    const pSumValue = breakdown[pSumKey] || 0;
    const baseAmt = Number(
        typeof pSumValue === 'object' ? (pSumValue.amt || pSumValue.amount || 0) : pSumValue
    ) || 0;

    let voAmt = 0;
    Object.values(voBreakdown).forEach(vo => {
        if (vo && vo.breakdown && vo.breakdown[pSumKey]) {
            voAmt += Number(vo.breakdown[pSumKey].amt || 0);
        }
    });
    const budget = baseAmt + voAmt;

    const totalInterimClaim = Number(cache.interimUsed[keyUpper] || 0);
    const totalOngoingWO = Number(cache.woUsed[keyUpper] || 0);

    const used = totalInterimClaim + totalOngoingWO;
    const balance = budget - used;

    return { budget, used, balance };
}

function isFinancialDeficitRisk(c) {
    if (!c.contract_start || !c.contract_end || !c.contract_sections_breakdown) return false;

    const hariIni = new Date();
    const start = new Date(c.contract_start);
    const end = new Date(c.contract_end);

    if (end < hariIni) return false;

    const totalMonths = Math.max(1,
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    );
    let monthsElapsed = (hariIni.getFullYear() - start.getFullYear()) * 12
        + (hariIni.getMonth() - start.getMonth()) + 1;
    monthsElapsed = Math.min(totalMonths, Math.max(1, monthsElapsed));

    const breakdown = c.contract_sections_breakdown || {};
    const pSumKey = findProvisionalSumKey(breakdown);
    if (!pSumKey) return false;

    const financial = getProvisionalSumBalance(c);
    if (financial.budget === 0) return false;

    const plannedTotalToDate = (financial.budget / totalMonths) * monthsElapsed;

    return financial.used > plannedTotalToDate;
}

function openDetail(type) {
    const configs = {
        ongoing: {
            title: "Ongoing Contracts",
            color: "#4ade80",
            render: (c) => ({ code: c.contract_code || c.id, sub: c.contract_name || "", subClass: "" })
        },
        renewal: {
            title: "Renewals Within 6 Months",
            color: "#fde047",
            render: (c) => ({ code: c.contract_code || c.id, sub: c.contract_end ? "Ends: " + formatDate(c.contract_end) : "", subClass: "warn" })
        },
        cpc: {
            title: "Available for Closing",
            color: "#c084fc",
            render: (c) => ({ code: c.contract_code || c.id, sub: c.contract_end ? "Ended: " + formatDate(c.contract_end) : "", subClass: "" })
        },
        risk: {
            title: "Financial Deficit Risk (S.O.R)",
            color: "#ff6b6b",
            render: (c) => {
                const financial = getProvisionalSumBalance(c);

                let remainingText = "Overdue";
                if (c.contract_end) {
                    const hariIni = new Date();
                    const tarikhTamat = new Date(c.contract_end);

                    if (tarikhTamat > hariIni) {
                        let diffY = tarikhTamat.getFullYear() - hariIni.getFullYear();
                        let diffM = tarikhTamat.getMonth() - hariIni.getMonth();

                        if (tarikhTamat.getDate() < hariIni.getDate()) diffM--;
                        if (diffM < 0) { diffM += 12; diffY--; }

                        let parts = [];
                        if (diffY > 0) parts.push(`${diffY} Year`);
                        if (diffM > 0 || parts.length === 0) parts.push(`${diffM} Month`);

                        remainingText = "Duration: " + parts.join(" ");
                    }
                }

                return {
                    code: c.contract_code || c.id,
                    sub: `
                        <div style="font-size: 11px; color: #fde047; font-weight: 600; margin-bottom: 2px;">
                            <i class="fa-regular fa-clock" style="font-size: 10px; margin-right: 3px;"></i>${remainingText}
                        </div>
                        <div class="danger" style="font-weight: 600;">Balance: ${formatRM(financial.balance)}</div>
                    `,
                    subClass: ""
                };
            }
        }
    };

    const cfg = configs[type];
    if (!cfg) return;

    const list = currentLists[type];

    detailPanelTitle.textContent = cfg.title;
    detailPanelTitle.style.color = cfg.color;
    detailPanelTitle.style.opacity = "1";

    if (list.length === 0) {
        detailList.innerHTML = `<div style="opacity:0.4; font-size:13px; text-align:center; margin-top:20px;">No contracts</div>`;
    } else {
        detailList.innerHTML = list.map(c => {
            const rendered = cfg.render(c);
            return `
                <div class="detail-item">
                    <span class="detail-item-code">${rendered.code}</span>
                    <span class="detail-item-sub ${rendered.subClass}">${rendered.sub}</span>
                </div>
            `;
        }).join("");
    }

    detailPanel.classList.add("visible");
}

function closeDetail() {
    if (detailPanel) detailPanel.classList.remove("visible");
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function getHelmSrc(name) {
    const n = name.toUpperCase();
    if (n.includes("SELENGGARA")) return "MaintHelm.png";
    if (n.includes("PEMATUHAN")) return "CompHelm.png";
    if (n.includes("ASET")) return "AssetFinHelm.png";
    if (n.includes("PROJEK")) return "ProjectsHelm.png";
    if (n.includes("ADMIN")) return "AdminHelm.png";
    return null;
}

function getBackgroundClass() {
    return "bg-maint"; // Default
}

async function loadSections() {
    try {
        const sectionsPromise = fetch(
            `${API_URL}/rest/v1/me_sections?select=*,units(*,contract(id,contract_code,contract_name,contract_start,contract_end,contract_sum,contract_sections_breakdown,vo_breakdown))`
        ).then(r => r.json());

        const interimsPromise = allInterimsCache
            ? Promise.resolve(allInterimsCache)
            : fetchAllRows(`${API_URL}/rest/v1/interims?select=id,contract_id,claim_breakdown`).then(data => {
                allInterimsCache = data;
                return data;
            });

        const workOrdersPromise = allWorkOrdersCache
            ? Promise.resolve(allWorkOrdersCache)
            : fetchAllRows(`${API_URL}/rest/v1/work_orders?select=id,contract_id,section_category,additional,status`).then(data => {
                allWorkOrdersCache = data;
                return data;
            });

        const [sections, allInterims, allWOs] = await Promise.all([sectionsPromise, interimsPromise, workOrdersPromise]);

        contractClaimCache = {};
        contractPSumKeyCache = {};

        sections.forEach(sec => {
            (sec.units || []).forEach(u => {
                (u.contract || []).forEach(c => {
                    if (!c.id || !c.contract_sections_breakdown) return;
                    const pKey = findProvisionalSumKey(c.contract_sections_breakdown);
                    if (pKey) contractPSumKeyCache[c.id] = pKey.toUpperCase().trim();
                });
            });
        });

        allInterims.forEach(im => {
            if (!im.contract_id || !im.claim_breakdown) return;
            if (!contractClaimCache[im.contract_id]) contractClaimCache[im.contract_id] = { interimUsed: {}, woUsed: {} };
            Object.entries(im.claim_breakdown).forEach(([s, val]) => {
                const amt = Number(typeof val === 'object' ? (val.amt || val.amount || 0) : val) || 0;
                const keyUpper = s.toUpperCase().trim();
                contractClaimCache[im.contract_id].interimUsed[keyUpper] =
                    (contractClaimCache[im.contract_id].interimUsed[keyUpper] || 0) + amt;
            });
        });

        allWOs.forEach(wo => {
            if (!wo.contract_id) return;

            const statusUpper = wo.status ? wo.status.toUpperCase().trim() : "";
            if (statusUpper === "CLAIMED") return;
            if (statusUpper === "VARIATION ORDER" || statusUpper === "VO") return;
            if (statusUpper === "CANCEL") return;

            if (!contractClaimCache[wo.contract_id]) contractClaimCache[wo.contract_id] = { interimUsed: {}, woUsed: {} };

            const pSumKeyRaw = contractPSumKeyCache[wo.contract_id];

            if (wo.section_category) {
                Object.entries(wo.section_category).forEach(([s, val]) => {
                    const amt = Number(typeof val === 'object' ? (val.amt || val.amount || 0) : val) || 0;
                    if (amt <= 0) return;
                    const keyUpper = s.toUpperCase().trim();
                    contractClaimCache[wo.contract_id].woUsed[keyUpper] =
                        (contractClaimCache[wo.contract_id].woUsed[keyUpper] || 0) + amt;
                });
            }

            const secCat = wo.section_category || {};
            const hasPSumInCat = Object.keys(secCat).some(
                k => k.toUpperCase().trim() === (pSumKeyRaw ? pSumKeyRaw.toUpperCase().trim() : "PROVISIONAL SUM")
            );

            const add = Number(wo.additional || 0);
            if (add > 0 && !hasPSumInCat) {
                if (pSumKeyRaw) {
                    const pKeyUpper = pSumKeyRaw.toUpperCase().trim();
                    contractClaimCache[wo.contract_id].woUsed[pKeyUpper] =
                        (contractClaimCache[wo.contract_id].woUsed[pKeyUpper] || 0) + add;
                }
            }
        });

        items = sections.map(sec => ({ id: sec.id, title: sec.section_name, units: sec.units || [] }));

        stepAngle = 360 / items.length;
        createWheel();

    } catch (err) {
        console.error("Failed to fetch data:", err);
    }
}

function createWheel() {
    wheel.innerHTML = "";
    items.forEach(item => {
        const el = document.createElement("div");
        el.className = "item";
        const src = getHelmSrc(item.title);

        if (src) {
            el.innerHTML = `<img src="${src}" class="section-helm">`;
        } else {
            el.innerText = item.title;
        }
        wheel.appendChild(el);
    });

    itemEls = root.querySelectorAll(".item");

    itemEls.forEach((el, i) => {
        el.addEventListener("click", (e) => {
            closeDetail();
            if (!isMobile) {
                let diff = i - index;
                if (diff > items.length / 2) diff -= items.length;
                if (diff < -items.length / 2) diff += items.length;
                baseAngle -= diff * stepAngle;
                index = i;
                update(); render();
                return;
            }
            index = i;
            update(); render();
            dismissFloating();

            const img = el.querySelector(".section-helm");
            root.classList.add("hide-wheel");
            if (img) {
                const r = img.getBoundingClientRect();
                const fl = document.createElement("img");
                fl.src = img.src;
                fl.className = "floating-helm";
                fl.style.transition = "none";
                fl.style.top = r.top + "px";
                fl.style.left = r.left + "px";
                fl.style.width = r.width + "px";
                fl.style.height = r.height + "px";
                document.body.appendChild(fl);
                currentFloating = fl;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        fl.style.transition = "";
                        const cardH = card.offsetHeight || 220;
                        const cardTop = window.innerHeight - cardH - 20;
                        fl.style.left = (window.innerWidth / 2 - r.width / 2) + "px";
                        fl.style.top = (cardTop - r.height - 12) + "px";
                    });
                });
            }
            setTimeout(() => card.classList.add("show-mobile"), 120);
        });
    });

    positionItems();
    update();
    render();
}

function dismissFloating() {
    if (currentFloating) { currentFloating.remove(); currentFloating = null; }
}

function positionItems() {
    itemEls.forEach((el, i) => {
        const theta = (i / items.length) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        const size = el.offsetWidth;
        el.style.left = `calc(50% + ${x}px - ${size / 2}px)`;
        el.style.top = `calc(50% + ${y}px - ${size / 2}px)`;
    });
}

function update() {
    if (itemEls.length === 0) return;

    closeDetail();

    itemEls.forEach(e => e.classList.remove("active"));
    itemEls[index].classList.add("active");

    const item = items[index];
    activeSection = { id: item.id, name: item.title };

    const newBgClass = getBackgroundClass(item.title);
    root.classList.remove("bg-maint");
    root.classList.add(newBgClass);

    title.innerText = item.title;
    cardTitle.innerText = item.title;

    currentLists = { ongoing: [], renewal: [], cpc: [], risk: [] };

    const hariIni = new Date();
    const enamBulanLagi = new Date();
    enamBulanLagi.setMonth(hariIni.getMonth() + 6);

    item.units.forEach(u => {
        (u.contract || []).forEach(c => {
            if (!c.contract_end) return;
            const tarikhTamat = new Date(c.contract_end);

            if (isFinancialDeficitRisk(c)) currentLists.risk.push(c);

            if (tarikhTamat < hariIni) {
                currentLists.cpc.push(c);
            } else if (tarikhTamat <= enamBulanLagi) {
                currentLists.renewal.push(c);
            } else {
                currentLists.ongoing.push(c);
            }
        });
    });

    cardDesc.innerHTML = `
        <div class="status-row" onclick="openDetail('ongoing')">
            <span>Ongoing Contracts</span>
            <span class="status-badge" style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);">
                ${currentLists.ongoing.length}
            </span>
        </div>
        <div class="status-row" onclick="openDetail('renewal')">
            <span>Contracts Renewals (Within 6M)</span>
            <span class="status-badge" style="background:rgba(234,179,8,0.15);color:#fde047;border:1px solid rgba(234,179,8,0.3);">
                ${currentLists.renewal.length}
            </span>
        </div>
        <div class="status-row" onclick="openDetail('cpc')">
            <span>Available for Closing</span>
            <span class="status-badge" style="background:rgba(147,51,234,0.15);color:#c084fc;border:1px solid rgba(147,51,234,0.3);">
                ${currentLists.cpc.length}
            </span>
        </div>
        <div class="status-row" onclick="openDetail('risk')">
            <span>Financial Deficit Risk (S.O.R)</span>
            <span class="status-badge" style="background:rgba(255,59,48,0.15);color:#ff6b6b;border:1px solid rgba(255,59,48,0.3);">
                ${currentLists.risk.length}
            </span>
        </div>
    `;

    openBtn.innerText = "Open Dashboard";

    if (!isMobile) {
        card.classList.remove("show");
        void card.offsetWidth;
        card.classList.add("show");
    }
}

function render() {
    if (itemEls.length === 0) return;
    wheel.style.transform = `translateY(-50%) rotate(${baseAngle}deg)`;
    itemEls.forEach(el => { el.style.transform = `rotate(${-baseAngle}deg) scale(0.9)`; });
    const activeScale = window.innerWidth >= 1800 ? 1.35 : 1.25;
    itemEls[index].style.transform = `rotate(${-baseAngle}deg) scale(${activeScale})`;
}

function next() { index = (index + 1) % items.length; baseAngle -= stepAngle; closeDetail(); update(); render(); }
function prev() { index = (index - 1 + items.length) % items.length; baseAngle += stepAngle; closeDetail(); update(); render(); }

/* ============================================================
   BLUEFORM SHARED LOGIC
   Extracted verbatim from contract-usage.html
   Digunakan bersama oleh: contract-usage.html, app-exec.html,
   app-sect.html, app-dept.html

   CARA GUNA:
   1. Letak <link rel="stylesheet" href="blueform.css"> di <head>
   2. Letak <script src="blueform-shared.js"></script> SEBELUM
      script page (supaya SB_URL/SB_KEY/headers tersedia dulu)
   3. Pastikan page TIDAK declare semula `const SB_URL`,
      `const SB_KEY`, atau `const headers` — sebab dah di-declare
      global kat sini. Kalau page lama ada declare balik, buang je.
   4. Pastikan page ada `let currentContractId = ...;` (global)
      sebelum panggil bulkDownloadBlueform(), sebab function tu
      rujuk currentContractId terus.
   5. Markup #bulkPreviewPage / #bulkPagesContainer / #bulkPreviewCount
      kena ada dalam HTML setiap page (copy dari contract-usage.html)
      sebab function² ni terus manipulate elemen tu.
   6. Kalau page ada checkbox "select all" (cth: #checkAllBF) untuk
      bulk blueform, panggil toggleAllBF(this) pada onchange -- ia
      akan check/uncheck semua .bf-checkbox sekaligus.
   ============================================================ */

const SB_URL = 'https://ywmsvowroxzhrjwrhsru.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXN2b3dyb3h6aHJqd3Joc3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDU5MzcsImV4cCI6MjA4Nzg4MTkzN30.OHJ-I_T3QID8y8eaoOBWeG2nKd2FhHfzG4P515Rzfks';
const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

function generatePresetFromContractCode(contractCode) {
    if (!contractCode) return 'RSAJ/M&E/IP/11-';
    
    // Sesuai untuk: 'RSAJ/KP/T/111/2023', 'RanhillSAJ/KP/T/110/2023', 'RSAJ/KP/T/111/23' dll.
    // Regex ini mencari coretan "/[nombor]/[2 atau 4 digit tahun]" di bahagian paling belakang string
    const match = contractCode.match(/\/(\d+)\/(\d{2,4})$/);
    
    if (match) {
        let contractNo = match[1]; // Mengambil angka kontrak (Contoh: 110 atau 111)
        let yearPart = match[2];   // Mengambil angka tahun (Contoh: 2023 atau 23)
        
        // Jika tahun ditulis 4 digit (2023), kita potong ambil 2 digit belakang sahaja (23)
        let shortYear = yearPart.length === 4 ? yearPart.substring(2) : yearPart;
        
        return `RSAJ/M&E/IP/11-${contractNo}/${shortYear}`;
    }
    
    // Jika format contract_code pelik dan tidak menepati corak, ia akan return default preset ini
    return 'RSAJ/M&E/IP/11-';
}

function getInitials(text){
    const ignore = ['AND','OF','THE','&','DAN'];
    return text.toUpperCase().replace(/[^A-Z\s]/g,'').split(/\s+/)
        .filter(word => word.length > 0 && !ignore.includes(word))
        .map(word => word[0]).join('.');
}

function formatTarikhBM(dateStr){
    if(!dateStr) return '';
    const bulan = ['JANUARI','FEBRUARI','MAC','APRIL','MEI','JUN','JULAI','OGOS','SEPTEMBER','OKTOBER','NOVEMBER','DISEMBER'];
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function getActiveVO(voBreakdown, cutoffDate){
    const active = {};
    Object.entries(voBreakdown).forEach(([voName, vo]) => {
        const voDate = vo.vo_date ? new Date(vo.vo_date) : null;
        if(voDate && voDate <= cutoffDate){
            active[voName] = vo;
        }
    });
    return active;
}

function sortWOChronological(woArray, districtPriority) {
    return [...woArray].sort((a, b) => {
        // 1. qpb_date
        const d1 = new Date(a.qpb_date || "1900-01-01");
        const d2 = new Date(b.qpb_date || "1900-01-01");
        if (d1.getTime() !== d2.getTime()) return d1 - d2;

        // 2. created_at
        const t1 = new Date(a.created_at || "1900-01-01");
        const t2 = new Date(b.created_at || "1900-01-01");
        if (t1.getTime() !== t2.getTime()) return t1 - t2;

        // 3. district priority (ikut susunan dalam contract.area_code / districtPriority)
        const aDistrict = (a.district || '').toUpperCase().trim();
        const bDistrict = (b.district || '').toUpperCase().trim();
        const aRank = districtPriority[aDistrict] ?? 999;
        const bRank = districtPriority[bDistrict] ?? 999;
        if (aRank !== bRank) return aRank - bRank;

        // 4. sequence_no
        return (a.sequence_no || '').localeCompare(b.sequence_no || '');
    });
}

function buildInterimDateMap(allInterims){
    const map = new Map();
    (allInterims || []).forEach(int => {
        if (int && int.interim_no !== undefined && int.interim_no !== null) {
            map.set(String(int.interim_no), new Date(int.date_received || "1900-01-01"));
        }
    });
    return map;
}

function isWOPendingAtCutoff(wo, interimDateMap, cutoffDate){
    if (!wo.interim_no) return true; // tiada interim langsung -> pending
    const claimDate = interimDateMap.get(String(wo.interim_no));
    if (!claimDate) return true; // rekod interim tak jumpa -> anggap pending (selamat)
    return claimDate.getTime() > cutoffDate.getTime(); // claim belum wujud pada cutoff ini -> pending
}

function formatRM(v){
    return Number(v).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
}

async function buildBlueformData(id, sharedData = null) {

    const res = await fetch(`${SB_URL}/rest/v1/work_orders?id=eq.${id}&select=*,contract(*,units(unit_name))`, { headers });
    const result = await res.json();
    const data = result[0];

    const c = data.contract;
    const b = c.contract_sections_breakdown || {};
    const s = data.section_category ?? {};

    let totalSection = 0;
    Object.values(s).forEach(sec => { totalSection += Number(sec?.amt || 0); });
    let provisionalExtra = Number(data.additional || 0);
    let totalWorkValue = totalSection + provisionalExtra;

    let allInterims, allWO, localDistrictPriority;
    if (sharedData) {
        allInterims = sharedData.allInterims;
        allWO = sharedData.allWO;
        localDistrictPriority = sharedData.localDistrictPriority;
    } else {
        const [interimRes, woRes, areaRes] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${c.id}&order=date_received.asc`, { headers }),
            fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${c.id}`, { headers }),
            fetch(`${SB_URL}/rest/v1/contract?id=eq.${c.id}&select=area_code`, { headers })
        ]);
        allInterims = await interimRes.json();
        allWO = await woRes.json();
        const areaRows = await areaRes.json();

        localDistrictPriority = {};
        (areaRows[0]?.area_code || '').split(',')
            .map(a => a.trim().toUpperCase())
            .filter(a => a.length > 0)
            .forEach((a, i) => { localDistrictPriority[a] = i + 1; });
    }

    const sortedAllWO = sortWOChronological(allWO, localDistrictPriority);

    const cutoffDate = new Date(data.qpb_date);

    const interimDateMap = buildInterimDateMap(allInterims);

    let sectionUsed = {};
let totalSalvage = 0, totalPG = 0, totalTax = 0, totalPenalty = 0; // Tambah variable penalty

allInterims.forEach(int => {
    const intDate = new Date(int.date_received);
    if (intDate > cutoffDate) return;

    totalSalvage += Number(int.salvage_value || 0);
    totalPG += Number(int.performance_guarantee_sum || 0);
    totalTax += Number(int.tax || 0);
    totalPenalty += Number(int.penalty || 0); // Ambil data penalty dari interim

        const cat = int.claim_breakdown || {};
        Object.keys(cat).forEach(sec => {
            const val = Number(cat[sec]?.amt || cat[sec]?.amount || cat[sec]?.value || 0);
            if (!sectionUsed[sec]) sectionUsed[sec] = 0;
            sectionUsed[sec] += val;
        });
    });

    const currentWOIndex = sortedAllWO.findIndex(w => Number(w.id) === Number(data.id));

    sortedAllWO.forEach((wo, index) => {
        const woId = Number(wo.id);

        if (woId === Number(data.id)) return;         
        if (wo.status === 'CANCEL') return;             
        if (index >= currentWOIndex) return;            

        if (!isWOPendingAtCutoff(wo, interimDateMap, cutoffDate)) return;

        const cat = wo.section_category || {};
        Object.keys(cat).forEach(sec => {
            const amt = Number(cat[sec]?.amt || 0);
            if (!sectionUsed[sec]) sectionUsed[sec] = 0;
            sectionUsed[sec] += amt;
        });
        const add = Number(wo.additional || 0);
        if (add > 0) {
            if (!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;
            sectionUsed["PROVISIONAL SUM"] += add;
        }
    });

    const currentSections = data.section_category || {};
    Object.keys(currentSections).forEach(sec => {
        const amt = Number(currentSections[sec]?.amt || 0);
        if (!sectionUsed[sec]) sectionUsed[sec] = 0;
        sectionUsed[sec] += amt;
    });
    const currentAdd = Number(data.additional || 0);
    if (currentAdd > 0) {
        if (!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;
        sectionUsed["PROVISIONAL SUM"] += currentAdd;
    }

    const voBreakdown = c.vo_breakdown || {};
    const activeVO = getActiveVO(voBreakdown, cutoffDate);
    let totalActiveVO = 0;
    Object.values(activeVO).forEach(vo => { totalActiveVO += Number(vo.amt || 0); });

    let bakiKontrak = Number(c.contract_sum || 0) + totalActiveVO;

    allInterims.forEach(int => {
        const intDate = new Date(int.date_received);
        if (intDate > cutoffDate) return;
        let amt = 0;
        Object.values(int.claim_breakdown || {}).forEach(s => {
            amt += Number(s?.amt || s?.amount || s?.value || 0);
        });
        bakiKontrak -= amt;
bakiKontrak += Number(int.salvage_value || 0);
bakiKontrak += Number(int.performance_guarantee_sum || 0);
bakiKontrak -= Number(int.tax || 0);
bakiKontrak -= Number(int.penalty || 0); // Tolak denda untuk dapatkan baki bersih

    });

    sortedAllWO.forEach((wo, index) => {
        const woId = Number(wo.id);
        if (wo.status === 'CANCEL') return;
        if (index > currentWOIndex) return;        

        if (woId !== Number(data.id)) {
            if (!isWOPendingAtCutoff(wo, interimDateMap, cutoffDate)) return; 
        }

        bakiKontrak -= Number(wo.amount_spent || 0);
    });

    return {
    data, c, b, s,
    totalWorkValue, provisionalExtra,
    sectionUsed,
    totalSalvage, totalPG, totalTax, totalPenalty,
    bakiKontrak,
    voBreakdown, activeVO
};

}

async function buildBlueformDataGroup(ids, sharedData = null) {

    const woResults = await Promise.all(
        ids.map(id =>
            fetch(`${SB_URL}/rest/v1/work_orders?id=eq.${id}&select=*,contract(*,units(unit_name))`, { headers })
                .then(r => r.json()).then(r => r[0])
        )
    );

    const primaryWO = woResults[0];
    const c = primaryWO.contract;
    const b = c.contract_sections_breakdown || {};

    const combinedSections = {};
    let combinedProvisional = 0;
    woResults.forEach(wo => {
        const s = wo.section_category || {};
        Object.keys(s).forEach(sec => {
            const amt = Number(s[sec]?.amt || 0);
            if (!combinedSections[sec]) combinedSections[sec] = { amt: 0 };
            combinedSections[sec].amt += amt;
        });
        combinedProvisional += Number(wo.additional || 0);
    });

    let totalSection = 0;
    Object.values(combinedSections).forEach(sec => { totalSection += Number(sec?.amt || 0); });
    const totalWorkValue = totalSection + combinedProvisional;

    const combinedWorkId = woResults.map(w => w.work_id).join(', ');
    const uniqueLocations = [...new Set(woResults.map(w => (w.location || '').trim()).filter(l => l !== ''))];
    const combinedLocation = uniqueLocations.join(', ');
    const uniqueDescriptions = [
    ...new Map(
        woResults
            .map(w => [(w.description || '').trim().toLowerCase(), w.description])
            .filter(([k, v]) => k !== '')
    ).values()
];

const combinedDesc = uniqueDescriptions.join(', ');

    let allInterims, allWO, localDistrictPriority;
    if (sharedData) {
        allInterims = sharedData.allInterims;
        allWO = sharedData.allWO;
        localDistrictPriority = sharedData.localDistrictPriority;
    } else {
        const [interimRes, woRes, areaRes] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${c.id}&order=date_received.asc`, { headers }),
            fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${c.id}`, { headers }),
            fetch(`${SB_URL}/rest/v1/contract?id=eq.${c.id}&select=area_code`, { headers })
        ]);
        allInterims = await interimRes.json();
        allWO = await woRes.json();
        const areaRows = await areaRes.json();
        localDistrictPriority = {};
        (areaRows[0]?.area_code || '').split(',')
            .map(a => a.trim().toUpperCase())
            .filter(a => a.length > 0)
            .forEach((a, i) => { localDistrictPriority[a] = i + 1; });
    }

    const groupIds = new Set(ids.map(Number));

    const sortedAllWO = sortWOChronological(allWO, localDistrictPriority);

    const cutoffDate = new Date(Math.max(...woResults.map(wo => new Date(wo.qpb_date))));

    const interimDateMap = buildInterimDateMap(allInterims);

    let sectionUsed = {};

let totalSalvage = 0;
let totalPG = 0;
let totalTax = 0;
let totalPenalty = 0;

    allInterims.forEach(int => {
        const intDate = new Date(int.date_received);
        if (intDate > cutoffDate) return;

        totalSalvage += Number(int.salvage_value || 0);
        totalPG += Number(int.performance_guarantee_sum || 0);
        totalTax += Number(int.tax || 0);
totalPenalty += Number(int.penalty || 0);

        const cat = int.claim_breakdown || {};
        Object.keys(cat).forEach(sec => {
            const val = Number(cat[sec]?.amt || cat[sec]?.amount || cat[sec]?.value || 0);
            if (!sectionUsed[sec]) sectionUsed[sec] = 0;
            sectionUsed[sec] += val;
        });
    });

    const firstGroupIndex = sortedAllWO.findIndex(w => groupIds.has(Number(w.id)));

    sortedAllWO.forEach((wo, index) => {
        const woId = Number(wo.id);

        if (groupIds.has(woId)) return;            
        if (wo.status === 'CANCEL') return;
        if (index >= firstGroupIndex) return;      

        if (!isWOPendingAtCutoff(wo, interimDateMap, cutoffDate)) return;

        const cat = wo.section_category || {};
        Object.keys(cat).forEach(sec => {
            const amt = Number(cat[sec]?.amt || 0);
            if (!sectionUsed[sec]) sectionUsed[sec] = 0;
            sectionUsed[sec] += amt;
        });
        const add = Number(wo.additional || 0);
        if (add > 0) {
            if (!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;
            sectionUsed["PROVISIONAL SUM"] += add;
        }
    });

    woResults.forEach(wo => {
        const cat = wo.section_category || {};
        Object.keys(cat).forEach(sec => {
            const amt = Number(cat[sec]?.amt || 0);
            if (!sectionUsed[sec]) sectionUsed[sec] = 0;
            sectionUsed[sec] += amt;
        });
        const add = Number(wo.additional || 0);
        if (add > 0) {
            if (!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;
            sectionUsed["PROVISIONAL SUM"] += add;
        }
    });

    const voBreakdown = c.vo_breakdown || {};
    const activeVO = getActiveVO(voBreakdown, cutoffDate);
    let totalActiveVO = 0;
    Object.values(activeVO).forEach(vo => { totalActiveVO += Number(vo.amt || 0); });

    let bakiKontrak = Number(c.contract_sum || 0) + totalActiveVO;

    allInterims.forEach(int => {
        const intDate = new Date(int.date_received);
        if (intDate > cutoffDate) return;
        let amt = 0;
        Object.values(int.claim_breakdown || {}).forEach(s => {
            amt += Number(s?.amt || s?.amount || s?.value || 0);
        });
        bakiKontrak -= amt;
        bakiKontrak += Number(int.salvage_value || 0);
        bakiKontrak += Number(int.performance_guarantee_sum || 0);
        bakiKontrak -= Number(int.tax || 0);
bakiKontrak -= Number(int.penalty || 0);
    });

    sortedAllWO.forEach((wo, index) => {
        const woId = Number(wo.id);
        if (wo.status === 'CANCEL') return;

        const isInGroup = groupIds.has(woId);
        const isBeforeGroup = index < firstGroupIndex;
        if (!isInGroup && !isBeforeGroup) return;

        if (!isInGroup) {
            if (!isWOPendingAtCutoff(wo, interimDateMap, cutoffDate)) return;
        }

        bakiKontrak -= Number(wo.amount_spent || 0);
    });

    const combinedData = {
        ...primaryWO,
        work_id: combinedWorkId,
        location: combinedLocation,
        description: combinedDesc,
        section_category: combinedSections,
        additional: combinedProvisional,
        amount_spent: totalWorkValue,
        contract: c
    };

    return {
        data: combinedData, c, b,
        s: combinedSections,
        totalWorkValue,
        provisionalExtra: combinedProvisional,
        sectionUsed,
        totalSalvage, totalPG, totalTax,totalPenalty,
        bakiKontrak,
        voBreakdown, activeVO
    };
}

function buildBlueformHTML(payload) {
    const { data, c, b, s, totalWorkValue, provisionalExtra,
            sectionUsed, totalSalvage, totalPG, totalTax, totalPenalty,
            bakiKontrak, voBreakdown, activeVO } = payload;


    const effectiveVO = activeVO || voBreakdown;

    const seq = data.sequence_no || '';
// Gunakan data preset dari DB, jika tiada/kosong baru generate terus dari c.contract_code
const refPrefix = c.reference || generatePresetFromContractCode(c.contract_code); 

// Memastikan sambungan sequence no. cantik (Contoh hasil: RSAJ/M&E/IP/11-111/23 - JBP01)
let formattedRef = seq ? ` - ${seq}` : ''; 

    const unitName = (c.units?.unit_name || '').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    const tpl = Array.isArray(c.selected_sections) ? c.selected_sections : [];

    let dynamicHtml = '';
    let currentRow = 6;

    Object.keys(b).sort().forEach((key, idx) => {
        const label = b[key]?.desc || key;
        const active = tpl.length > 0 ? tpl.includes(key) : true;
        if(!active) return;
        const sumValue = b[key]?.amt || 0;
        let workValue = Number(s[key]?.amt || 0);

        dynamicHtml += `
        <div class="grp-dyn-${idx}">
            <hr style="border:0.5px solid #000;margin:8px 0;">
            <div class="bf-row">
                <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>${label.toUpperCase().includes('SUM') ? label : label + ' Sum'}</span></div>
                <div class="bf-colon">:</div>
                <div class="bf-value">RM ${Number(sumValue).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
            </div>
            <div class="bf-row">
                <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Anggaran Kerja (${getInitials(label)})</span></div>
                <div class="bf-colon">:</div>
                <div class="bf-value">RM ${workValue.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
            </div>
        </div>`;

        let voTotal = 0;
        let voLines = '';
        Object.entries(effectiveVO).forEach(([voName, vo]) => {
            const voAmt = Number(vo.breakdown?.[key]?.amt || 0);
            if(voAmt > 0){
                voTotal += voAmt;
                voLines += `
                <div class="bf-row" style="font-size:9px;color:#c0392b;">
                    <div class="bf-label"><span class="bf-no"></span><span>↳ ${voName}</span></div>
                    <div class="bf-colon">:</div>
                    <div class="bf-value">RM ${voAmt.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
                </div>`;
            }
        });

        if(voTotal > 0){
            dynamicHtml += `
            <div class="bf-row" style="font-size:9.5px;font-weight:700;color:#c0392b;">
                <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Variation Order (${getInitials(label)})</span></div>
                <div class="bf-colon">:</div>
                <div class="bf-value">RM ${voTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
            </div>
            ${voLines}`;
        }
    });

    function formatLocation(loc){
        if(!loc) return '';
        const parts = loc.split(',').map(part => {
            let txt = part.trim().toUpperCase();
            txt = txt.replace(/\bKAMPUNG\b/g,'KG');
            if(txt.includes('BPH') || txt.includes('RESERVOIR')) return txt;
            if(!txt.startsWith('LRA')) txt = 'LRA ' + txt;
            return txt;
        });
        return parts.join(', ');
    }

    const locationText = formatLocation(data.location);

    const bakiSectionRows = Object.keys(b).map(sec => {
        let label = (b[sec].desc || '').toUpperCase();
        if(label.includes('GENERAL') || label.includes('PRELIMINARIES')) label = 'G&P';
        else if(label.includes('PREVENTIVE')) label = 'PREVENTIVE MAINTENANCE';
        else if(label.includes('PROACTIVE')) label = 'PROACTIVE MAINTENANCE';
        label = label.replace(/CHARGES/g,'').trim();
        const contractAmt = Number(b[sec]?.amt || 0);
        let voForSec = 0;
        Object.values(effectiveVO).forEach(vo => { voForSec += Number(vo.breakdown?.[sec]?.amt || 0); });
        const usedAmt = Number(sectionUsed[sec] || 0);
        const baki = (contractAmt + voForSec) - usedAmt;
        return `
        <div class="bf-row" style="font-size:9px;">
            <div class="bf-label" style="width:220px;"><span style="margin-left:25px;">${label}</span></div>
            <div class="bf-colon">:</div>
            <div class="bf-value">RM ${baki.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
        </div>`;
    }).join('');

    let totalActiveVO = 0;
    Object.values(effectiveVO).forEach(vo => { totalActiveVO += Number(vo.amt || 0); });
    const effectiveContractSum = Number(c.contract_sum || 0) + totalActiveVO;

    const contentHtml = `
        <div class="bf-row"><div class="bf-label"><span class="bf-no">1</span><span>   No. Rujukan</span></div><div class="bf-colon">:</div><div class="bf-value">${refPrefix}${formattedRef}</div></div>

        <div class="bf-row"><div class="bf-label"><span class="bf-no">2</span><span>   No. Work Order</span></div><div class="bf-colon">:</div><div class="bf-value">${data.work_id}</div></div>
        <div class="bf-row"><div class="bf-label"><span class="bf-no">3</span><span>   No. Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value">${c.contract_code}</div></div>
        <div class="bf-row"><div class="bf-label"><span class="bf-no">4</span><span>   Nama Kontraktor</span></div><div class="bf-colon">:</div><div class="bf-value">${c.contractor}</div></div>
        <div class="bf-row"><div class="bf-label"><span class="bf-no">5</span><span>   Tempoh Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value">${formatTarikhBM(c.contract_start)} ~ ${formatTarikhBM(c.contract_end)}</div></div>

        ${dynamicHtml}

        <div class="bf-row">
            <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Anggaran Kerja (<i>Tambahan</i>)</span></div>
            <div class="bf-colon">:</div>
            <div class="bf-value">RM ${provisionalExtra.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
        </div>

        <hr style="border:0.5px solid #000;margin:8px 0;">
        <div class="bf-row">
            <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Jumlah Harga Kontrak</span></div>
            <div class="bf-colon">:</div>
            <div class="bf-value">RM ${effectiveContractSum.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
        </div>

        <div style="margin-top:8px;">
            <div class="bf-row"><div class="bf-label"><span class="bf-no">${currentRow++}</span><span>BAKI</span></div><div class="bf-colon">:</div><div class="bf-value"></div></div>
            <div class="bf-baki-table">
                ${bakiSectionRows}
                <div class="bf-row" style="font-size:9px;">
                    <div class="bf-label" style="width:220px;"><span style="margin-left:25px;">SALVAGE VALUE</span></div>
                    <div class="bf-colon">:</div>
                    <div class="bf-value">RM ${totalSalvage.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
                </div>
                <div class="bf-row" style="font-size:9px;">
                    <div class="bf-label" style="width:220px;"><span style="margin-left:25px;">PERFORMANCE GUARANTEE</span></div>
                    <div class="bf-colon">:</div>
                    <div class="bf-value">RM ${totalPG.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
                </div>
                <div class="bf-row" style="font-size:9px;">
    <div class="bf-label" style="width:220px;"><span style="margin-left:25px;">TAX</span></div>
    <div class="bf-colon">:</div>
    <div class="bf-value">RM ${totalTax.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
</div>
<div class="bf-row" style="font-size:9px;">
    <div class="bf-label" style="width:220px;"><span style="margin-left:25px;">PENALTY</span></div>
    <div class="bf-colon">:</div>
    <div class="bf-value" style="color: #dc2626;">RM ${totalPenalty.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
</div>

            </div>
        </div>

        <div class="bf-row" style="margin-top:8px;">
            <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Baki Harga Kontrak</span></div>
            <div class="bf-colon">:</div>
            <div class="bf-value" style="font-weight:bold;">RM ${bakiKontrak.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
        </div>
        <hr style="border:0.5px solid #000;margin:8px 0;">
        <div class="bf-row">
            <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Tajuk Kerja</span></div>
            <div class="bf-colon">:</div>
            <div class="bf-value">${data.description.toUpperCase()} DI ${locationText} (RM ${totalWorkValue.toLocaleString(undefined,{minimumFractionDigits:2})})</div>
        </div>
    `;

    return `
    <div class="a4-container" style="
    width:210mm;
    height:297mm;
    margin:0; background:white;
        padding:1.3cm 2cm 1.2cm 2cm; position:relative;
        font-size:11px; color:black; line-height:1.3;
        box-sizing:border-box; display:flex; flex-direction:column;
        overflow:hidden; box-shadow:0 4px 30px rgba(0,0,0,0.4);
        page-break-inside:avoid; flex-shrink:0;">
        <img src="RSAJ.png" class="bf-logo" alt="RSAJ Logo"
            onerror="this.src='https://upload.wikimedia.org/wikipedia/en/thumb/3/3d/Ranhill_SAJ_logo.svg/1200px-Ranhill_SAJ_logo.svg.png'">
        <div id="bf_title" style="text-align:center;font-weight:bold;margin-top:0.7cm;margin-bottom:12px;padding:0 50px;font-size:10px;">
            PERMOHONAN KERJA-KERJA S.O.R / TAMBAHAN DALAM KONTRAK PENYELENGGARAAN
        </div>
        <div id="bf_content" style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
            ${contentHtml}
        </div>
        <div class="bf-signature-grid">
            <div>
                <strong>Dimohon Oleh:</strong>
                <div style="height:70px;"></div>
                <div class="bf-sign-line"></div>
                <small>${unitName ? `Eksekutif ${unitName}` : 'Eksekutif'}</small>
            </div>
            <div>
                <strong>Disemak Oleh:</strong>
                <div style="height:70px;"></div>
                <div class="bf-sign-line"></div>
                <small>Ketua Seksyen Selenggara</small>
            </div>
            <div>
                <strong>Disahkan Oleh:</strong>
                <div style="height:70px;"></div>
                <div class="bf-sign-line"></div>
                <small>Ketua Mekanikal & Elektrikal</small>
            </div>
            <div>
                <strong>Disokong Oleh:</strong>
                <div style="height:70px;"></div>
                <div class="bf-sign-line"></div>
                <small>Ketua Bahagian Operasi & Penyelenggaraan</small>
            </div>
        </div>
        <div class="bf-footer-note">
            * Sebutharga dan Work Order telah disemak sepenuhnya oleh Pihak Daerah
        </div>
    </div>`;
}

async function openBlueform(id) {
    try {
        const container = document.getElementById('bulkPagesContainer');
        container.innerHTML = '';
        document.getElementById('bulkPreviewCount').innerText = 'Memuatkan...';
        document.getElementById('bulkPreviewPage').style.display = 'block';
        const payload = await buildBlueformData(id);
        container.innerHTML = buildBlueformHTML(payload);
        document.getElementById('bulkPreviewCount').innerText = payload.data.work_id || '';
    } catch(e) {
        console.error(e);
        alert("Ralat memaparkan borang.");
    }
}

async function openBlueformGroup(idsStr) {
    const ids = idsStr.split(',').map(id => id.trim());
    const container = document.getElementById('bulkPagesContainer');
    container.innerHTML = '';
    document.getElementById('bulkPreviewCount').innerText = 'Memuatkan...';
    document.getElementById('bulkPreviewPage').style.display = 'block';
    try {
        const payload = ids.length === 1
            ? await buildBlueformData(ids[0])
            : await buildBlueformDataGroup(ids);
        container.innerHTML = buildBlueformHTML(payload);
        document.getElementById('bulkPreviewCount').innerText =
            ids.length > 1 ? `Gabungan ${ids.length} Work Order` : (payload.data.work_id || '');
    } catch(e) {
        console.error(e);
        alert("Ralat memaparkan borang.");
    }
}

function toggleBfGroup(className, isVisible){
    const elements = document.getElementsByClassName(className);
    for(let el of elements) isVisible ? el.classList.remove('hide-group') : el.classList.add('hide-group');
}

async function bulkDownloadBlueform() {
    const checked = [...document.querySelectorAll('.bf-checkbox:checked')];
    if (checked.length === 0) { alert("Sila pilih Blueform."); return; }

    const container = document.getElementById('bulkPagesContainer');
    container.innerHTML = '';
    document.getElementById('bulkPreviewCount').innerText = `Memuatkan ${checked.length} blueform...`;
    document.getElementById('bulkPreviewPage').style.display = 'block';

    const contractId = currentContractId;
    try {
        const [interimRes, woRes, areaRes] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${contractId}&order=date_received.asc`, { headers }),
            fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${contractId}`, { headers }),
            fetch(`${SB_URL}/rest/v1/contract?id=eq.${contractId}&select=area_code`, { headers })
        ]);
        const allInterims = await interimRes.json();
        const allWO = await woRes.json();
        const areaRows = await areaRes.json();

        const localDistrictPriority = {};
        (areaRows[0]?.area_code || '').split(',')
            .map(a => a.trim().toUpperCase())
            .filter(a => a.length > 0)
            .forEach((a, i) => { localDistrictPriority[a] = i + 1; });

        const sharedData = { allInterims, allWO, localDistrictPriority };

        const payloads = await processInBatches(checked, 5, cb => {
            const idsStr = cb.value;
            const ids = idsStr.split(',').map(id => id.trim());
            return ids.length === 1
                ? buildBlueformData(ids[0], sharedData)
                : buildBlueformDataGroup(ids, sharedData);
        });

        container.innerHTML = payloads.map(p => buildBlueformHTML(p)).join('');
        document.getElementById('bulkPreviewCount').innerText = `${checked.length} Blueform — Sedia untuk Cetak`;
    } catch (e) {
        console.error(e);
        alert("Ralat memuatkan bulk blueform.");
        document.getElementById('bulkPreviewCount').innerText = 'Ralat memuatkan data.';
    }
}

// Check/uncheck semua .bf-checkbox sekaligus. Panggil ni dari
// onchange checkbox "select all" (cth: <input onchange="toggleAllBF(this)">)
function toggleAllBF(el){
    document.querySelectorAll('.bf-checkbox').forEach(cb => { cb.checked = el.checked; });
}

async function processInBatches(items, batchSize, fn){
    const results = [];
    for(let i = 0; i < items.length; i += batchSize){
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

function closeBulkPreview(){
    document.getElementById('bulkPreviewPage').style.display = 'none';
    document.getElementById('bulkPagesContainer').innerHTML = '';
}

/* ------------------------------------------------------------
   GROUPING HELPERS (untuk approval pages: app-exec.html,
   app-sect.html, app-dept.html, dll.)

   Work order yang berkongsi district + sequence_no yang sama
   patut digabung jadi SATU blueform (openBlueformGroup), bukan
   dibuka berasingan. Helper ni sentralkan logic tu supaya setiap
   page approval tak perlu tulis semula.
   ------------------------------------------------------------ */

// Bina map { "DISTRICT||SEQ": [wo1, wo2, ...] } daripada senarai work order
function buildSequenceGroups(workOrders){
    const seqGroups = {};
    (workOrders || []).forEach(w => {
        const seq = (w.sequence_no || '').trim();
        if(seq !== ''){
            const district = (w.district || '').trim().toUpperCase();
            const groupKey = district + '||' + seq;
            if(!seqGroups[groupKey]) seqGroups[groupKey] = [];
            seqGroups[groupKey].push(w);
        }
    });
    return seqGroups;
}

function getBlueformGroupKey(w){
    const seq = (w.sequence_no || '').trim();
    const district = (w.district || '').trim().toUpperCase();
    return district + '||' + seq;
}

// Jana HTML butang blueform untuk SATU work order, ambil kira grouping.
// - Kalau ada sequence_no & ini row pertama dalam group -> butang gabung (openBlueformGroup)
// - Kalau ada sequence_no tapi bukan row pertama -> label "rujuk row pertama"
// - Kalau tiada sequence_no (standalone) -> butang tunggal (openBlueform)
//
// seqGroups         : hasil buildSequenceGroups(workOrders)
// renderedSeqsSet   : Set kosong yang dikongsi merentasi loop render (untuk track group mana dah papar)
// opts.btnClass      : override tailwind/class butang (optional)
// opts.groupLabel     : function(count) -> teks butang group (optional)
// opts.singleLabel    : teks butang standalone (optional)
function renderBlueformButtonHtml(item, seqGroups, renderedSeqsSet, opts = {}){
    const btnClass = opts.btnClass ||
        'text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 mr-2';
    const groupLabel = opts.groupLabel || (count => `<i class="fa-solid fa-layer-group mr-1"></i> Lihat Blueform (${count})`);
    const singleLabel = opts.singleLabel || `<i class="fa-solid fa-file-lines mr-1"></i> Lihat Blueform`;

    const seq = (item.sequence_no || '').trim();

    if(seq !== ''){
        const groupKey = getBlueformGroupKey(item);
        if(!renderedSeqsSet.has(groupKey)){
            renderedSeqsSet.add(groupKey);
            const group = seqGroups[groupKey] || [item];
            const allIdsStr = group.map(g => g.id).join(',');
            return `<button onclick="openBlueformGroup('${allIdsStr}')" class="${btnClass}">${groupLabel(group.length)}</button>`;
        }
        return `<span class="text-xs text-gray-400 italic mr-2">Rujuk row pertama sequence ${seq}</span>`;
    }

    return `<button onclick="openBlueform(${item.id})" class="${btnClass}">${singleLabel}</button>`;
}

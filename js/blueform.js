export async function openBlueform(id){
    console.log("OPEN BF:", id);  // 🔥 test
    window.currentBFId = id;
  
    try {

        const res = await fetch(`${SB_URL}/rest/v1/work_orders?id=eq.${id}&select=*,contract(*,units(unit_name))`, { headers });
        const result = await res.json();
        const data = result[0];

        const seq = data.sequence_no || '';

        const c = data.contract;
        const refPrefix = c.reference || 'RSAJ/M&E/IP/11-';
        
        let formattedRef = seq.replace(/([A-Z]{2,4}\d+)$/i, ' - $1');
        const unitName = (c.units?.unit_name || '').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        const b = c.contract_sections_breakdown || {};
        const s = data.section_category ?? {};

        // =============================
// KIRAAN NILAI KERJA
// =============================

// jumlah kerja dari section_category
let totalSection = 0;

Object.values(s).forEach(sec => {
    totalSection += Number(sec?.amt || 0);
});

// kerja tambahan (PROVISIONAL)
let provisionalExtra = Number(data.additional || 0);

// jumlah sebenar work order
let totalWorkValue = totalSection + provisionalExtra;

        // ambil semua interim ikut kronologi
const interimRes = await fetch(
`${SB_URL}/rest/v1/interims?contract_id=eq.${c.id}&order=date_received.asc`,
{ headers }
);

const allInterims = await interimRes.json();

        let cutoffDate = new Date(data.qpb_date);

/* jika work order sudah claimed */
if(data.status === "Claimed"){

for(const int of allInterims){

const cat = int.claim_breakdown || {};

const found = Object.values(cat).some(sec =>
Number(sec?.work_order_id) === Number(data.id)
);

if(found){

cutoffDate = new Date(int.date_received);
break;

}

}

}
        
        const woRes = await fetch(
`${SB_URL}/rest/v1/work_orders?contract_id=eq.${c.id}`,
{ headers }
);

let allWO = await woRes.json();
let sectionUsed = {};
let totalSalvage = 0;
let totalPG = 0;
let timeline = [];

/* ambil area order dari database */
const areaRes = await fetch(
`${SB_URL}/rest/v1/contract?id=eq.${c.id}&select=area_code`,
{ headers }
);

const areaRows = await areaRes.json();

const areaPriority = {};

const areaList = (areaRows[0]?.area_code || '')
.split(',')
.map(a => a.trim().toUpperCase())
.filter(a => a.length > 0);

areaList.forEach((a,i)=>{
    areaPriority[a] = i + 1;
});
        
// sort ikut kronologi
// sort ikut kronologi sebenar
allWO.sort((a,b)=>{

    /* 1️⃣ TARIKH QPB */
    const d1 = new Date(a.qpb_date);
    const d2 = new Date(b.qpb_date);

    if(d1 < d2) return -1;
    if(d1 > d2) return 1;

    /* 2️⃣ AREA PRIORITY (jika tarikh sama) */
    const aArea = (a.area_code || '').toUpperCase();
    const bArea = (b.area_code || '').toUpperCase();

    const aRank = areaPriority[aArea] ?? 999;
    const bRank = areaPriority[bArea] ?? 999;

    if(aRank < bRank) return -1;
    if(aRank > bRank) return 1;

    /* 3️⃣ SEQUENCE NUMBER */
    const aSeq = parseInt((a.sequence_no || '').match(/\d+/)?.[0] || 0);
    const bSeq = parseInt((b.sequence_no || '').match(/\d+/)?.[0] || 0);

    return aSeq - bSeq;

});

// 1️⃣ Tolak INTERIM dahulu (ikut date_received)
allInterims.forEach(int => {

const intDate = new Date(int.date_received);
const curDate = cutoffDate;

if(intDate > curDate) return;

const salvage = Number(int.salvage_value || 0);
const pg = Number(int.performance_guarantee_sum || 0);

totalSalvage += salvage;
totalPG += pg;

const cat = int.claim_breakdown || {};

let amt = 0;

Object.values(cat).forEach(s=>{
    amt += Number(s?.amt || s?.amount || s?.value || 0);
});

timeline.push({
    type:'INTERIM',
    date:int.date_received,
    amount:amt,
    salvage:salvage,
    pg:pg
});
    
    Object.keys(cat).forEach(sec => {

        const val = Number(cat[sec]?.amt || cat[sec]?.amount || cat[sec]?.value || 0);

        if(!sectionUsed[sec]) sectionUsed[sec] = 0;

        sectionUsed[sec] += val;

    });

});

allWO.filter(w => {

/* skip claimed */
if(w.status === "Claimed") return false;

/* skip work order semasa */
if(Number(w.id) === Number(data.id)) return false;

if(!w.qpb_date) return false;

const woDate = new Date(w.qpb_date);
const curDate = cutoffDate;

/* 1️⃣ jika tarikh lebih awal → kira */
if(woDate < curDate) return true;

/* 2️⃣ jika tarikh lebih lewat → jangan kira */
if(woDate > curDate) return false;

/* 3️⃣ jika tarikh sama → ikut AREA */
const wArea = (w.area_code || '').toUpperCase();
const curArea = (data.area_code || '').toUpperCase();

const wRank = areaPriority[wArea] || 99;
const curRank = areaPriority[curArea] || 99;

if(wRank < curRank) return true;
if(wRank > curRank) return false;

/* 4️⃣ jika area sama → ikut sequence */
const wSeq = parseInt((w.sequence_no || '').match(/\d+/)?.[0] || 0);
const curSeq = parseInt((data.sequence_no || '').match(/\d+/)?.[0] || 0);

return wSeq <= curSeq;

})
.forEach(wo => {

timeline.push({
type:'WORKORDER',
date:wo.qpb_date,
seq:parseInt((wo.sequence_no || '').match(/\d+/)?.[0] || 0),
amount:Number(wo.amount_spent || 0),
salvage:0
});
    
    const cat = wo.section_category || {};

    Object.keys(cat).forEach(sec => {

        const amt = Number(cat[sec]?.amt || 0);

        if(!sectionUsed[sec]) sectionUsed[sec] = 0;

        sectionUsed[sec] += amt;

    });

    /* tambahan PROVISIONAL SUM */
const add = Number(wo.additional || 0);

if(add > 0){
    if(!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;
    sectionUsed["PROVISIONAL SUM"] += add;
}

});        

        /* ================================
   TAMBAH NILAI WORK ORDER SEMASA
   supaya baki section = selepas WO ini
================================ */

const currentSections = data.section_category || {};

Object.keys(currentSections).forEach(sec => {

const amt = Number(currentSections[sec]?.amt || 0);

if(!sectionUsed[sec]) sectionUsed[sec] = 0;

sectionUsed[sec] += amt;

});

/* tambahan provisional WO semasa */

const currentAdd = Number(data.additional || 0);

if(currentAdd > 0){

if(!sectionUsed["PROVISIONAL SUM"]) sectionUsed["PROVISIONAL SUM"] = 0;

sectionUsed["PROVISIONAL SUM"] += currentAdd;

}
    /* ================================
   TAMBAH WORK ORDER SEMASA
   supaya baki kontrak selepas WO ini
================================ */

timeline.push({
type:'WORKORDER',
date:data.qpb_date,
seq:parseInt((data.sequence_no || '').match(/\d+/)?.[0] || 0),
amount: totalWorkValue,
salvage:0
});
        let dynamicHtml = '';
            let currentRow = 6;

            const tpl = JSON.parse(localStorage.getItem(`bf_sections_${c.id}`) || '{}');
            
            Object.keys(b).sort().forEach((key, idx) => {

    const label = b[key]?.desc || tpl[key]?.label || key;
    const active = tpl[key]?.active ?? true;

    if (!active) return;

    const sumValue = b[key]?.amt || 0;

    let workValue = Number(s[key]?.amt || 0);

    dynamicHtml += `
        <div class="grp-dyn-${idx}">
            <hr style="border:0.5px solid #000;margin:8px 0;">

            <div class="bf-row">
    <div class="bf-label"><span class="bf-no">${currentRow++}</span><span>${label.toUpperCase().includes('SUM') ? label : label + ' Sum'}</span></div><div class="bf-colon">:</div><div class="bf-value">RM ${sumValue.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>

            <div class="bf-row">
    <div class="bf-label">
        <span class="bf-no">${currentRow++}</span>
        <span>Anggaran Kerja (${getInitials(label)})</span></div><div class="bf-colon">:</div><div class="bf-value">RM ${workValue.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
        </div>
    `;
});

let totalContract = Number(c.contract_sum || 0);

timeline.sort((a,b)=>{

const d1 = new Date(a.date);
const d2 = new Date(b.date);

if(d1 < d2) return -1;
if(d1 > d2) return 1;

/* interim dahulu */
if(a.type !== b.type){
return a.type === 'INTERIM' ? -1 : 1;
}

/* workorder ikut sequence */
if(a.type === 'WORKORDER'){
return (a.seq || 0) - (b.seq || 0);
}

return 0;

});
        
let bakiKontrak = totalContract;

timeline.forEach(t => {

if(t.type === 'INTERIM'){
    bakiKontrak -= t.amount;
    bakiKontrak += (t.salvage || 0);
    bakiKontrak += (t.pg || 0);
}

else if(t.type === 'WORKORDER'){
    bakiKontrak -= t.amount;
}

});
        
let locationText = formatLocation(data.location);

function formatLocation(loc){
if(!loc) return '';

let txt = loc.toUpperCase().trim();

/* tukar KAMPUNG → KG */
txt = txt.replace(/\bKAMPUNG\b/g,'KG');

/* jika ada BPH atau RESERVOIR → kekalkan */
if(txt.includes('BPH') || txt.includes('RESERVOIR')){
return txt;
}

/* jika belum ada LRA → tambah */
if(!txt.startsWith('LRA')){
txt = 'LRA ' + txt;
}

return txt;

}
        
            let html = `
                <div class="bf-row"><div class="bf-label"><span class="bf-no">1</span><span>   No. Rujukan</span></div><div class="bf-colon">:</div><div class="bf-value">${refPrefix}${formattedRef}</div></div>
                <div class="bf-row"><div class="bf-label"><span class="bf-no">2</span><span>   No. Work Order</span></div><div class="bf-colon">:</div><div class="bf-value">${data.work_id}</div></div>
                <div class="bf-row"><div class="bf-label"><span class="bf-no">3</span><span>   No. Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value">${c.contract_code}</div></div>
                <div class="bf-row"><div class="bf-label"><span class="bf-no">4</span><span>   Nama Kontraktor</span></div><div class="bf-colon">:</div><div class="bf-value">${c.contractor}</div></div>
                <div class="bf-row"><div class="bf-label"><span class="bf-no">5</span><span>   Tempoh Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value">${formatTarikhBM(c.contract_start)} ~ ${formatTarikhBM(c.contract_end)}</div></div>
                
                ${dynamicHtml}

<div class="bf-row">
    <div class="bf-label">
        <span class="bf-no">${currentRow++}</span>
        <span>Anggaran Kerja (<i>Tambahan</i>)</span>
    </div>
    <div class="bf-colon">:</div>
    <div class="bf-value">
        RM ${provisionalExtra.toLocaleString(undefined,{minimumFractionDigits:2})}
    </div>
</div>
                <hr style="border: 0.5px solid #000; margin: 8px 0;">
                <div class="bf-row"><div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Jumlah Harga Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value">RM ${Number(c.contract_sum || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
                
                <div style="margin-top: 8px;">
                    <div class="bf-row"><div class="bf-label"><span class="bf-no">${currentRow++}</span><span>BAKI</span></div><div class="bf-colon">:</div><div class="bf-value"></div></div>
                    <div class="bf-baki-table">
                    ${Object.keys(b).map(sec => {

let label = (b[sec].desc || '').toUpperCase();

if(label.includes('GENERAL') || label.includes('PRELIMINARIES')){
label = 'G&P';
}
else if(label.includes('PREVENTIVE')){
label = 'PREVENTIVE MAINTENANCE';
}
else if(label.includes('PROACTIVE')){
label = 'PROACTIVE MAINTENANCE';
}

label = label.replace(/CHARGES/g,'').trim();

const contractAmt = Number(b[sec]?.amt || 0);
const usedAmt = Number(sectionUsed[sec] || 0);

const baki = contractAmt - usedAmt;

return `

<div class="bf-row" style="font-size:9px;">
<div class="bf-label" style="width:220px;">
<span style="margin-left:25px;">${label}</span>
</div>
<div class="bf-colon">:</div>
<div class="bf-value">
RM ${baki.toLocaleString(undefined,{minimumFractionDigits:2})}
</div>
</div>
`;

}).join('')}

<div class="bf-row" style="font-size:9px;">
<div class="bf-label" style="width:220px;">
<span style="margin-left:25px;">SALVAGE VALUE</span>
</div>
<div class="bf-colon">:</div>
<div class="bf-value">
RM ${totalSalvage.toLocaleString(undefined,{minimumFractionDigits:2})}
</div>
</div>

<div class="bf-row" style="font-size:9px;">
<div class="bf-label" style="width:220px;">
<span style="margin-left:25px;">PERFORMANCE GUARANTEE</span>
</div>
<div class="bf-colon">:</div>
<div class="bf-value">
RM ${totalPG.toLocaleString(undefined,{minimumFractionDigits:2})}
</div>
</div>

</div></div>
                <div class="bf-row" style="margin-top:8px;"><div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Baki Harga Kontrak</span></div><div class="bf-colon">:</div><div class="bf-value" style="font-weight:bold;">RM ${bakiKontrak.toLocaleString(undefined,{minimumFractionDigits:2})}</div></div>
                <hr style="border: 0.5px solid #000; margin: 8px 0;">
                <div class="bf-row"><div class="bf-label"><span class="bf-no">${currentRow++}</span><span>Tajuk Kerja</span></div><div class="bf-colon">:</div><div class="bf-value">${data.description.toUpperCase()} DI ${locationText} (RM ${totalWorkValue.toLocaleString(undefined,{minimumFractionDigits:2})})</div></div>
            `;

            document.getElementById('bf_executive_unit').innerText =unitName ? `Eksekutif ${unitName}` : 'Eksekutif';
            const bf = document.getElementById('blueformPage');

document.getElementById('bf_content').innerHTML = html;

bf.classList.add('active');

/* 🔥 paksa visible */
bf.style.display = 'block';

/* 🔥 force reflow (WAJIB) */
bf.offsetHeight;
        
        } catch (e) { 
    console.error(e);
    alert("Ralat memaparkan borang."); 
}
    }

    function toggleBfGroup(className, isVisible) {
        const elements = document.getElementsByClassName(className);
        for (let el of elements) isVisible ? el.classList.remove('hide-group') : el.classList.add('hide-group');
    }

    function closeBlueform() {
    const bf = document.getElementById('blueformPage');
    
    bf.classList.remove('active');
    bf.style.display = 'none';   // 🔥 WAJIB tambah ini
}
  function printBlueform() {

    const bf = document.getElementById('blueformPage');

    if (!bf.classList.contains('active')) {
        alert("Blueform belum dibuka.");
        return;
    }

    // 🔥 force render dulu
    bf.style.display = 'block';
    bf.offsetHeight;

    // 🔥 tunggu render + paint
    setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
            });
        });
    }, 200);
}


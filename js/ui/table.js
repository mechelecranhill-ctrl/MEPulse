function renderTable(data, showArea = true){

    currentTableData = data;

    const tbody = document.getElementById('workOrderTbody');

    let html = '';
    let currentArea = '';

    data.forEach(w => {

        const area = (w.area_code || 'LAIN').toUpperCase();

        if(showArea && area !== currentArea){
            html += `
            <tr class="area-header">
                <td colspan="9">
                    <i class="fa fa-layer-group"></i> ${area}
                </td>
            </tr>`;
            currentArea = area;
        }

        html += `
        <tr>
            <td>
                <span class="tag ${w.status === 'Claimed' ? 'claimed' : 'pending'}">
                    ${w.status || 'PENDING'}
                </span>
            </td>

            <td><strong>${w.sequence_no || '-'}</strong></td>
            <td><strong>${w.work_id}</strong></td>

            <td>
                <div>${w.description}</div>
                <small>${w.location || 'N/A'}</small>
            </td>

            <td>${w.interim_no ? 'INT-' + w.interim_no : '-'}</td>

            <td>
                RM ${(w.amount_spent || 0).toLocaleString(undefined,{minimumFractionDigits:2})}
                ${buildSectionBreakdown(w)}
            </td>

            <td>
                RM ${(w.status === 'Claimed' ? w.amount_spent : 0)
                    .toLocaleString(undefined,{minimumFractionDigits:2})}
            </td>

            <td>${formatTarikhBM(w.qpb_date)}</td>

            <td>
                <button onclick="openBlueform(${w.id})">Blueform</button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;

    renderMobileCards(data);
}

function sortWorkOrders(data, areaPriority){
    return data.sort((a,b)=>{
        const aArea = (a.area_code || '').toUpperCase();
        const bArea = (b.area_code || '').toUpperCase();

        const aRank = areaPriority[aArea] ?? 999;
        const bRank = areaPriority[bArea] ?? 999;

        if(aRank !== bRank){
            return aRank - bRank;
        }

        const aSeq = parseInt(a.sequence_no) || 0;
        const bSeq = parseInt(b.sequence_no) || 0;

        return aSeq - bSeq;
    });
}

function formatTarikhBM(dateStr){
    if(!dateStr) return '';

    const bulan = ['JAN','FEB','MAC','APR','MEI','JUN','JUL','OGOS','SEP','OKT','NOV','DIS'];

    const d = new Date(dateStr);

    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function buildSectionBreakdown(work){

    const s = work.section_category || {};
    let html = '';

    Object.keys(s).forEach(sec=>{
        const amt = Number(s[sec]?.amt || 0);

        if(amt <= 0) return;

        html += `
        <div style="font-size:11px;">
            ${sec} : RM ${amt.toLocaleString()}
        </div>`;
    });

    return html;
}

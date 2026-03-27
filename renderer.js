import { formatRM, formatTarikhBM } from './utils.js';

export function renderTable(data){

    const tbody = document.getElementById('workOrderTbody');

    tbody.innerHTML = data.map(w => `
        <tr>
            <td>${w.status || ''}</td>
            <td>${w.sequence_no || '-'}</td>
            <td>${w.work_id || '-'}</td>
            <td>${w.description || ''}</td>
            <td>${w.interim_no ? 'INT-'+w.interim_no : '-'}</td>
            <td>RM ${formatRM(w.amount_spent)}</td>
            <td>${formatTarikhBM(w.qpb_date)}</td>
        </tr>
    `).join('');
}

export function renderMobileCards(data){

    const container = document.getElementById('mobileCardContainer');

    container.innerHTML = data.map(w => `
        <div class="mobile-card">

            <div class="mobile-card-header">
                <div class="mobile-title">
                    ${w.sequence_no ? w.sequence_no + ' — ' : ''}${w.work_id || '-'}
                </div>

                <span class="tag ${w.status === 'Claimed' ? 'claimed' : 'pending'}">
                    ${w.status || 'PENDING'}
                </span>
            </div>

            <div class="mobile-sub">${w.description || '-'}</div>

            <div class="mobile-row">
                <span>Amaun</span>
                <strong>RM ${formatRM(w.amount_spent)}</strong>
            </div>

            <div class="mobile-row">
                <span>Tarikh</span>
                <strong>${formatTarikhBM(w.qpb_date)}</strong>
            </div>

        </div>
    `).join('');
}

import { formatTarikhBM } from './utils.js';

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
                <strong>RM ${(w.amount_spent || 0).toLocaleString()}</strong>
            </div>

        </div>
    `).join('');
}

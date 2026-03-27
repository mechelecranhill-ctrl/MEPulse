// mobile.js
export function renderMobileCards(works){
    const container = document.getElementById('mobileCardContainer');
    container.innerHTML = '';
    works.forEach(w => {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-title">${w.work_id}</div>
                <div class="mobile-sub">${w.location}</div>
            </div>
            <div class="mobile-row">Amaun Kerja: RM ${w.amount_work || 0}</div>
            <div class="mobile-row">Amaun Claim: RM ${w.amount_claim || 0}</div>
        `;
        container.appendChild(card);
    });
}

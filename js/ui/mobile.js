function renderMobileCards(data){

    const container = document.getElementById('mobileCardContainer');
    if(!container) return;

    let html = '';

    data.forEach(w => {

        html += `
        <div class="mobile-card">

            <div>
                <strong>${w.work_id}</strong>
                <span>${w.status}</span>
            </div>

            <div>${w.description}</div>
            <div>${w.location}</div>

            <div>RM ${(w.amount_spent || 0).toLocaleString()}</div>

            <button onclick="openBlueform(${w.id})">Blueform</button>

        </div>`;
    });

    container.innerHTML = html;
}

// table.js
import { state } from './state.js';
import { renderMobileCards } from './mobile.js';

export function renderTable(data, showArea = true){
    state.currentTableData = data;
    const tbody = document.getElementById('workOrderTbody');
    tbody.innerHTML = '';

    data.forEach(w => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${w.status || ''}</td>
            <td>${w.sequence_no || ''}</td>
            <td>${w.work_id || ''}</td>
            <td>${w.description || ''} / ${w.location || ''}</td>
            <td>${w.interim_no || ''}</td>
            <td>${w.amount_work || ''}</td>
            <td>${w.amount_claim || ''}</td>
            <td>${w.qpb_date || ''}</td>
            <td>
                <button onclick="alert('Action')">Action</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderMobileCards(data);
}
 

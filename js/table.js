import { formatTarikhBM, formatRM } from './utils.js';

export function renderTable(data){
  const tbody = document.getElementById('workOrderTbody');

  tbody.innerHTML = data.map(w => `
    <tr>
      <td>${w.work_id}</td>
      <td>${formatTarikhBM(w.qpb_date)}</td>
      <td>${formatRM(w.amount_spent)}</td>
    </tr>
  `).join('');
}

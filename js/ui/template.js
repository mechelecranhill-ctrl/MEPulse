// template.js
import { state } from './state.js';
import { patchContract } from './api.js';

export function openTemplate(contract){
    const container = document.getElementById('dynamicRowsContainer');
    container.innerHTML = '';
    const sections = contract.contract_sections_breakdown || {};
    const saved = JSON.parse(localStorage.getItem(`bf_sections_${contract.id}`) || '{}');

    document.getElementById('refPrefixInput').value = contract.reference || 'RSAJ/M&E/IP/11-';

    Object.keys(sections).forEach(key => {
        const desc = sections[key]?.desc || '';
        const label = saved[key]?.label || desc;
        const active = saved[key]?.active ?? true;
        addTemplateRow(`${key} — ${desc}`, label, active, key);
    });

    document.getElementById('templateModal').style.display = 'flex';
}

export function addTemplateRow(display, label, active, key){
    const container = document.getElementById('dynamicRowsContainer');
    const div = document.createElement('div');
    div.className = 'modal-row';
    div.dataset.key = key;
    div.innerHTML = `
        <input type="text" value="${display}" readonly style="background:#f5f5f5;font-weight:bold;">
        <input type="text" class="tpl-label" value="${label}">
        <label><input type="checkbox" class="tpl-active" ${active ? 'checked' : ''}></label>
    `;
    container.appendChild(div);
}

export async function saveTemplate(contractId){
    const rows = document.querySelectorAll('#dynamicRowsContainer .modal-row');
    const obj = {};
    rows.forEach(r => {
        const key = r.dataset.key;
        const label = r.querySelector('.tpl-label').value;
        const active = r.querySelector('.tpl-active').checked;
        obj[key] = { label: label || key, active };
    });

    localStorage.setItem(`bf_sections_${contractId}`, JSON.stringify(obj));
    const prefix = document.getElementById('refPrefixInput').value;
    await patchContract(contractId, { reference: prefix });
    alert("Template berjaya disimpan!");
    document.getElementById('templateModal').style.display = 'none';
}

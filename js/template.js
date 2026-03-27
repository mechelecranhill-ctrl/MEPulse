export function openTemplate(){     // --- TEMPLATE MANAGER LOGIC ---
    const id = currentContractId;

if(!id){
    alert("Tiada kontrak dipilih.");
    return;
}
    const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
    const data = await res.json();
    const contract = data[0];
    const sections = contract.contract_sections_breakdown || {};
        const saved = JSON.parse(localStorage.getItem(`bf_sections_${id}`) || '{}');
    const container = document.getElementById('dynamicRowsContainer');
    const savedPrefix = contract.reference || 'RSAJ/M&E/IP/11-';
        document.getElementById('refPrefixInput').value = savedPrefix;
    container.innerHTML = '';
    Object.keys(sections).forEach(key => {
    const desc = sections[key]?.desc || '';
    const display = `${key} — ${desc}`;
    const label = saved[key]?.label || desc;
    const active = saved[key]?.active ?? true;
    addTemplateRow(display, label, active, key);
    });
    document.getElementById('templateModal').style.display = 'flex';
}
    function addTemplateRow(display, label, active, realKey) {
    const container = document.getElementById('dynamicRowsContainer');
    const div = document.createElement('div');
    div.className = 'modal-row';
    div.innerHTML = `
<input type="text" value="${display}" readonly style="background:#f5f5f5;font-weight:bold;">
<input type="text" class="tpl-label" value="${label}" placeholder="Label untuk borang (optional)">
<label style="display:flex;align-items:center;font-size:11px;">
<input type="checkbox" class="tpl-active" ${active ? 'checked' : ''}>
</label>
`;
        div.dataset.key = realKey;
        container.appendChild(div);
} 
export function saveTemplate(){     async function saveTemplate() {
        const rows = document.querySelectorAll('#dynamicRowsContainer .modal-row');
        let obj = {};        
        rows.forEach(r => {
            const key = r.dataset.key;
            const label = r.querySelector('.tpl-label').value;
            const active = r.querySelector('.tpl-active').checked;
    obj[key] = {
        label: label || key,
        active: active
    };

});
        const id = currentContractId;
        /* simpan template section */
        localStorage.setItem(`bf_sections_${id}`, JSON.stringify(obj));        
        /* ambil prefix */
        const prefix = document.getElementById('refPrefixInput').value;
        /* hantar ke database contract.reference */
        await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, {
            method:'PATCH',
            headers,
            body: JSON.stringify({  
                reference: prefix
            })
        });
        alert("Template berjaya disimpan!");        
        closeTemplate();       
    }

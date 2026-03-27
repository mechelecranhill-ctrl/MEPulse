// main.js
import { fetchContract, fetchWorkOrders, fetchInterims } from './api.js';
import { state } from './state.js';
import { generateDistrictTabs } from './ui/district.js';
import { renderMobileCards } from './ui/mobile.js';
import { renderTable } from './ui/table.js';
import { renderTemplateModal } from './ui/template.js';
import { calculateBlueform } from './blueform/calculator.js';
import { generateBlueform } from './blueform/generator.js';
import { printBlueform } from './blueform/print.js';

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if(!id) return;

    state.currentContractId = id;
    const contract = await fetchContract(id);
    state.allWorks = await fetchWorkOrders(id);

    document.getElementById('viewTitle').innerText = contract.contract_code;
    document.getElementById('viewSubtitle').innerText = contract.contract_name;

    renderTable(state.allWorks, true);
    renderMobileCards(state.allWorks);
    generateDistrictTabs(state.allWorks);

    const interims = await fetchInterims(id);
    generateBlueform(contract, state.allWorks);
    
    document.getElementById('tableWrapper').style.display = 'block';
};

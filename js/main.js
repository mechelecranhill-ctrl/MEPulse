// main.js
import { fetchContract, fetchWorkOrders, fetchInterims } from './api.js';
import { state } from './state.js';
import { renderTable } from './table.js';
import { renderMobileCards } from './mobile.js';
import { generateDistrictTabs } from './district.js';
import { openTemplate } from './template.js';
import { generateBlueform } from './generator.js';

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

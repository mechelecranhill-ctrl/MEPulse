// js/main.js
import { fetchContract, fetchWorkOrders, fetchInterims } from '/MEPulse/js/api.js';
import { state } from '/MEPulse/js/state.js';
import { generateDistrictTabs } from '/MEPulse/js/ui/district.js';
import { renderMobileCards } from '/MEPulse/js/ui/mobile.js';
import { renderTable } from '/MEPulse/js/ui/table.js';
import { renderTemplateModal } from '/MEPulse/js/ui/template.js';
import { calculateBlueform } from '/MEPulse/js/blueform/calculator.js';
import { generateBlueform } from '/MEPulse/js/blueform/generator.js';
import { printBlueform } from '/MEPulse/js/blueform/print.js';

window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    state.currentContractId = id;

    try {
        // Fetch contract & work orders
        const contract = await fetchContract(id);
        state.allWorks = await fetchWorkOrders(id);

        // Update title/subtitle
        document.getElementById('viewTitle').innerText = contract.contract_code;
        document.getElementById('viewSubtitle').innerText = contract.contract_name;

        // Render table & mobile cards
        renderTable(state.allWorks, true);
        renderMobileCards(state.allWorks);

        // Render district tabs
        generateDistrictTabs(state.allWorks);

        // Fetch interims & generate blueform
        const interims = await fetchInterims(id);
        generateBlueform(contract, state.allWorks);

        // Show table wrapper
        document.getElementById('tableWrapper').style.display = 'block';
    } catch (err) {
        console.error('Error loading contract data:', err);
        alert('Gagal memuat data kontrak. Sila semak console.');
    }
};

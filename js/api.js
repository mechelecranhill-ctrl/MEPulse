// app.js (entry point)
import { openTemplate, saveTemplate } from './template.js';
import { fetchContract, fetchWorkOrders, fetchInterims } from './api.js';
import { SB_URL, headers } from './config.js';
import './state.js';
import './table.js';
import './blueform.js';
import './utils.js';

// Panggil fungsi bila button diklik
document.getElementById('openBtn').addEventListener('click', openTemplate);

// Contoh: load kontrak bila halaman ready
async function init() {
    const contract = await fetchContract(currentContractId);
    console.log(contract);
}

init();

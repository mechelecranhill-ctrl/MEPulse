import { getContract, getWorkOrders, getInterims } from './api.js';
import { state } from './state.js';
import { renderTable, renderMobileCards } from './renderer.js';
import { sortByArea, sortByDate } from './filters.js';
import { buildInterimMatrix } from './interim.js';

async function init(){

    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;

    state.currentContractId = id;

    state.contract = await getContract(id);
    state.workOrders = await getWorkOrders(id);
    state.interims = await getInterims(id);

    buildAreaPriority();

    updateUI();
}

function buildAreaPriority(){

    const list = (state.contract.area_code || '')
        .split(',')
        .map(a => a.trim().toUpperCase());

    list.forEach((a,i)=>{
        state.areaPriority[a] = i + 1;
    });
}

function updateUI(){

    let data = state.workOrders;

    if(state.currentView === "AREA"){
        data = sortByArea(data, state.areaPriority);
    } else {
        data = sortByDate(data);
    }

    renderTable(data);
    renderMobileCards(data);

    buildInterimMatrix(state.contract, state.interims);
}

init();

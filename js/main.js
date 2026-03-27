import { fetchContract, fetchWorkOrders } from './api.js';
import { renderTable } from './table.js';
import { state } from './state.js';

window.onload = async () => {

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if(!id) return;

  state.currentContractId = id;

  const contract = await fetchContract(id);
  const works = await fetchWorkOrders(id);

  state.allWorks = works;

  renderTable(works);
};

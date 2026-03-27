import { getContract, getWorkOrders } from './api.js';
import { renderTable } from './table.js';
import { renderMobileCards } from './mobile.js';

export async function loadDashboard(id){

  const contract = await getContract(id);
  const works = await getWorkOrders(id);

  renderTable(works);
  renderMobileCards(works);
}

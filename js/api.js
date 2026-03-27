import { SB_URL, headers } from './config.js';

export async function fetchContract(id) {
  const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
  return (await res.json())[0];
}

export async function fetchWorkOrders(contractId) {
  const res = await fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${contractId}`, { headers });
  return await res.json();
}

export async function fetchInterims(contractId) {
  const res = await fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${contractId}&order=date_received.asc`, { headers });
  return await res.json();
}

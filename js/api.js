import { SB_URL, headers } from './config.js';

export async function getContract(id){
  const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
  return (await res.json())[0];
}

export async function getWorkOrders(id){
  const res = await fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${id}`, { headers });
  return await res.json();
}

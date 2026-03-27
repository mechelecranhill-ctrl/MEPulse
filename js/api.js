// api.js
import { SB_URL, headers } from './config.js';

export async function fetchContract(id){
    const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
    return (await res.json())[0];
}

export async function fetchWorkOrders(id){
    const res = await fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${id}`, { headers });
    return await res.json();
}

export async function fetchInterims(id){
    const res = await fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${id}`, { headers });
    return await res.json();
}

export async function patchContract(id, payload){
    const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
    });
    return await res.json();
}

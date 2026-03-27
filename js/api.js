async function fetchContract(id){
    const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
    return (await res.json())[0];
}

async function fetchWorkOrders(id){
    const res = await fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${id}`, { headers });
    return await res.json();
}

async function fetchInterims(id){
    const res = await fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${id}`, { headers });
    return await res.json();
}

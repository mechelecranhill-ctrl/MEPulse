const SB_URL = 'https://ywmsvowroxzhrjwrhsru.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXN2b3dyb3h6aHJqd3Joc3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDU5MzcsImV4cCI6MjA4Nzg4MTkzN30.OHJ-I_T3QID8y8eaoOBWeG2nKd2FhHfzG4P515Rzfks';

const headers = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json'
};

export async function getContract(id){
    const res = await fetch(`${SB_URL}/rest/v1/contract?id=eq.${id}`, { headers });
    return (await res.json())[0];
}

export async function getWorkOrders(contractId){
    const res = await fetch(`${SB_URL}/rest/v1/work_orders?contract_id=eq.${contractId}`, { headers });
    return await res.json();
}

export async function getInterims(contractId){
    const res = await fetch(`${SB_URL}/rest/v1/interims?contract_id=eq.${contractId}&order=date_received.asc`, { headers });
    return await res.json();
}

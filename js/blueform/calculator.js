function calculateBaki(contract, interims, workorders){

    let total = Number(contract.contract_sum || 0);

    interims.forEach(i=>{
        total -= Number(i.net_amount || 0);
        total += Number(i.salvage_value || 0);
    });

    workorders.forEach(w=>{
        total -= Number(w.amount_spent || 0);
    });

    return total;
}

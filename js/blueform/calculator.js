// calculator.js
export function calculateTotals(works){
    const totalWork = works.reduce((acc,w)=> acc + (w.amount_work || 0), 0);
    const totalClaim = works.reduce((acc,w)=> acc + (w.amount_claim || 0), 0);
    return { totalWork, totalClaim };
}

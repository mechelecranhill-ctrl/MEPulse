export function formatRM(v){
    return Number(v || 0).toLocaleString(undefined,{
        minimumFractionDigits:2,
        maximumFractionDigits:2
    });
}

export function formatTarikhBM(dateStr){
    if(!dateStr) return '';

    const bulan = [
        'JANUARI','FEBRUARI','MAC','APRIL','MEI','JUN',
        'JULAI','OGOS','SEPTEMBER','OKTOBER','NOVEMBER','DISEMBER'
    ];

    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function extractSeq(val){
    return parseInt((val || '').match(/\d+/)?.[0] || 0);
}

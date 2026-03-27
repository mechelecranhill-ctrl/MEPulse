export function sortByArea(data, areaPriority){
    return [...data].sort((a,b)=>{
        const aRank = areaPriority[a.area_code] ?? 999;
        const bRank = areaPriority[b.area_code] ?? 999;

        if(aRank !== bRank) return aRank - bRank;

        const aSeq = parseInt(a.sequence_no) || 0;
        const bSeq = parseInt(b.sequence_no) || 0;

        return aSeq - bSeq;
    });
}

export function filterDistrict(data, district){
    if(district === 'ALL') return data;
    return data.filter(w => w.district === district);
}

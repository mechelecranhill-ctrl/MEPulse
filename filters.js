import { extractSeq } from './utils.js';

export function sortByArea(data, areaPriority){
    return [...data].sort((a,b)=>{

        const aRank = areaPriority[(a.area_code||'').toUpperCase()] ?? 999;
        const bRank = areaPriority[(b.area_code||'').toUpperCase()] ?? 999;

        if(aRank !== bRank) return aRank - bRank;

        return extractSeq(a.sequence_no) - extractSeq(b.sequence_no);
    });
}

export function sortByDate(data){
    return [...data].sort((a,b)=>{
        const d1 = new Date(a.qpb_date || "1900-01-01");
        const d2 = new Date(b.qpb_date || "1900-01-01");

        if(d1 - d2 !== 0) return d1 - d2;

        return extractSeq(a.sequence_no) - extractSeq(b.sequence_no);
    });
}

export function filterDistrict(data, district){
    if(district === 'ALL') return data;
    return data.filter(w => (w.district || '') === district);
}

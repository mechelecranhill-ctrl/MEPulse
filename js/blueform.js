export function calculateWorkValue(data){
    let total = 0;

    Object.values(data.section_category || {}).forEach(sec=>{
        total += Number(sec?.amt || 0);
    });

    return total + Number(data.additional || 0);
}

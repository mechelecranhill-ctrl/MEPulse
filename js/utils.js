export function formatTarikhBM(dateStr){
  if(!dateStr) return '';
  const bulan = [...];
  const d = new Date(dateStr);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRM(v){
  return Number(v).toLocaleString(undefined,{
    minimumFractionDigits:2
  });
}

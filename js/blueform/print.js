// print
export function printBlueform(){
    const el = document.getElementById('blueformPage');
    el.classList.add('active');
    window.print();
}
export function closeBlueform(){
    const el = document.getElementById('blueformPage');
    el.classList.remove('active');
}

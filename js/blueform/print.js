function printBlueform(){

    const bf = document.getElementById('blueformPage');

    if(!bf) return;

    bf.style.display = 'block';

    setTimeout(()=>{
        window.print();
    },200);
}

function closeBlueform(){
    document.getElementById('blueformPage').style.display = 'none';
}

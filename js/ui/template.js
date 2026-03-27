function openTemplate(){
    document.getElementById('templateModal').style.display = 'flex';
}

function closeTemplate(){
    document.getElementById('templateModal').style.display = 'none';
}

function addTemplateRow(label='',active=true){

    const container = document.getElementById('dynamicRowsContainer');

    const div = document.createElement('div');

    div.innerHTML = `
        <input value="${label}">
        <input type="checkbox" ${active?'checked':''}>
    `;

    container.appendChild(div);
}

function saveTemplate(){

    let rows = document.querySelectorAll('#dynamicRowsContainer div');

    let data = [];

    rows.forEach(r=>{
        const input = r.querySelector('input');
        const check = r.querySelector('input[type=checkbox]');

        data.push({
            label: input.value,
            active: check.checked
        });
    });

    localStorage.setItem('bf_template', JSON.stringify(data));

    alert('Saved');
}

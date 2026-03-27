async function openBlueform(id){

    const res = await fetch(`${SB_URL}/rest/v1/work_orders?id=eq.${id}`, { headers });
    const data = (await res.json())[0];

    const html = `
        <div>
            <h3>BLUEFORM</h3>

            <div>No WO: ${data.work_id}</div>
            <div>Lokasi: ${data.location}</div>
            <div>Amaun: RM ${Number(data.amount_spent).toLocaleString()}</div>

        </div>
    `;

    document.getElementById('bf_content').innerHTML = html;

    document.getElementById('blueformPage').style.display = 'block';
}

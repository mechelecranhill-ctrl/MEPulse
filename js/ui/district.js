function generateDistrictTabs(data){

    const container = document.getElementById("districtTabs");

    let districts = [...new Set(data.map(w => w.district || "LAIN"))];

    let html = `<div onclick="filterDistrict('ALL',this)">SEMUA</div>`;

    districts.forEach(d=>{
        html += `<div onclick="filterDistrict('${d}',this)">${d}</div>`;
    });

    container.innerHTML = html;
}

function filterDistrict(district,el){

    document.querySelectorAll('#districtTabs div')
        .forEach(t=>t.classList.remove('active'));

    el.classList.add('active');

    if(district === "ALL"){
        renderTable(allWorks,false);
        return;
    }

    const filtered = allWorks.filter(w => (w.district || '') === district);

    const sorted = sortWorkOrders(filtered, areaPriority || {});

    renderTable(sorted,true);
}

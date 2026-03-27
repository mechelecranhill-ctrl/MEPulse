// district.js
import { state } from './state.js';
import { renderTable } from './table.js';

export function generateDistrictTabs(works){
    const container = document.getElementById('districtTabs');
    container.innerHTML = '';
    const districts = ['ALL', ...new Set(works.map(w => w.area_code).filter(Boolean))];

    districts.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'district-tab' + (d === 'ALL' ? ' active' : '');
        btn.innerText = d;
        btn.onclick = () => filterDistrict(d, btn);
        container.appendChild(btn);
    });
}

export function filterDistrict(district, btn){
    document.querySelectorAll('.district-tab').forEach(t => t.classList.remove('active'));
    if(btn) btn.classList.add('active');

    let filtered = state.allWorks;
    if(district !== 'ALL'){
        filtered = filtered.filter(w => w.area_code === district);
    }

    renderTable(filtered, true);
}

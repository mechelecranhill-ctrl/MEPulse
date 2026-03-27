// generator.js
import { state } from './state.js';

export function generateBlueform(contract, works){
    const container = document.getElementById('bf_content');
    container.innerHTML = '';

    Object.keys(state.bfSections).forEach(sectionKey => {
        const section = state.bfSections[sectionKey];
        if(!section.active) return;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'bf-row';
        sectionDiv.innerHTML = `
            <div class="bf-label">${section.label}</div>
            <div class="bf-value">
                ${works.filter(w=>w.section === sectionKey).map(w => `${w.description} (${w.amount_work})`).join('<br>')}
            </div>
        `;
        container.appendChild(sectionDiv);
    });
}

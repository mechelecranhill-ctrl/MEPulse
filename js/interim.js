import { formatRM } from './utils.js';

export function buildInterimMatrix(contract, interims){

    const head = `<tr>
        <th>ITEM</th>
        <th>DESCRIPTION</th>
        <th>AS PER CONTRACT</th>
    </tr>`;

    document.getElementById("interimHead").innerHTML = head;

    let body = '';

    Object.keys(contract.contract_sections_breakdown || {}).forEach(sec=>{
        body += `
        <tr>
            <td></td>
            <td>${sec}</td>
            <td>${formatRM(contract.contract_sections_breakdown[sec].amt)}</td>
        </tr>`;
    });

    document.getElementById("interimBody").innerHTML = body;
}

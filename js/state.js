// state.js
export const state = {
    currentContractId: null,
    currentView: 'AREA', // AREA | DATE
    allWorks: [],
    areaPriority: {},
    currentTableData: [],
    bfSections: JSON.parse(localStorage.getItem('bf_sections_v2')) || {
        "LABOUR CHARGES": { label: "Labour Charges", active: true },
        "SUPPLY SPARE PART": { label: "Supply Spare Part", active: true },
        "PROVISIONAL SUM": { label: "Provisional Sum", active: true }
    }
};

window.onload = async () => {

    const urlParams = new URLSearchParams(window.location.search);
    const contractId = urlParams.get('id');

    if(!contractId) return;

    currentContractId = contractId;

    const contract = await fetchContract(contractId);
    allWorks = await fetchWorkOrders(contractId);
    const interims = await fetchInterims(contractId);

    setupAreaPriority(contract);
    renderHeader(contract);

    renderTable(allWorks);
    renderMobileCards(allWorks);

    buildInterimMatrix(contract, interims, allWorks);
    generateDistrictTabs(allWorks);
};

async function uploadQuotationToOneDrive(fileInputId, workIdValue, unitValue, statusDivId, hiddenUrlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusDivId);
    const hiddenUrlInput = document.getElementById(hiddenUrlInputId);

    if (!fileInput || !fileInput.files.length) {
        alert("Sila pilih fail PDF terlebih dahulu!");
        return;
    }

    workIdValue = (workIdValue || '').trim();
    if (!workIdValue) {
        alert("Sila pastikan Work ID sudah diisi!");
        return;
    }

    const file = fileInput.files[0];

    if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0078d4";
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses fail ${workIdValue}.pdf ke Microsoft List...`;
    }

    const sharePointApiUrl = "https://ranhill-my.sharepoint.com/personal/muhammad_iman_ranhill_com_my/_api/web/lists/getbytitle('Quotation Queue')/items";
    const siteBaseUrl = sharePointApiUrl.split('/_api/')[0];

    try {
        // 1. Dapatkan Request Digest (Token keselamatan yang SharePoint perlukan untuk elak 403)
        const digestRes = await fetch(`${siteBaseUrl}/_api/contextinfo`, {
            method: "POST",
            headers: { "Accept": "application/json;odata=verbose" }
        });
        
        if (!digestRes.ok) {
            throw new Error("Gagal mengesahkan hak akses (Form Digest) dengan SharePoint.");
        }
        
        const digestData = await digestRes.json();
        const requestDigest = digestData.d.GetContextWebInformation.FormDigestValue;

        // 2. Cipta item di Microsoft List (Hantar Digest Token bersama)
        const itemResponse = await fetch(sharePointApiUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json;odata=verbose",
                "Content-Type": "application/json;odata=verbose",
                "X-RequestDigest": requestDigest // 👈 DITAMBAH UNTUK SELESAIKAN 403
            },
            body: JSON.stringify({
                "__metadata": { "type": "SP.Data.Quotation_x0020_QueueListItem" },
                "Title": workIdValue,
                "Unit": unitValue
            })
        });

        if (!itemResponse.ok) {
            throw new Error(`Gagal mencipta rekod di Microsoft Lists. Status: ${itemResponse.status}`);
        }

        const itemData = await itemResponse.json();
        const itemId = itemData.d.Id;

        // 3. Lampirkan PDF ke item List
        const attachmentUrl = `${sharePointApiUrl}(${itemId})/AttachmentFiles/add(FileName='${workIdValue}.pdf')`;
        const attachResponse = await fetch(attachmentUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json;odata=verbose",
                "X-RequestDigest": requestDigest // 👈 DITAMBAH UNTUK SELESAIKAN 403
            },
            body: file
        });

        if (!attachResponse.ok) {
            throw new Error("Gagal melampirkan fail ke item Lists.");
        }

        // Selepas item & attachment berjaya dicipta, FLOW ANDA DI GAMBAR AKAN TRIGER SECARA AUTOMATIK!
        if (hiddenUrlInput) hiddenUrlInput.value = `${workIdValue}.pdf`;

        if (statusDiv) {
            statusDiv.style.color = "#34C759";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Berjaya! Item dicipta & Flow OneDrive dipicu.`;
        }
        alert(`Fail bagi ${workIdValue} berjaya di-upload! Flow automatik sedang memproses fail ke OneDrive.`);

    } catch (error) {
        console.error("Uploader Error:", error);
        if (statusDiv) {
            statusDiv.style.color = "#FF3B30";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Ralat berlaku semasa memproses fail.`;
        }
        alert("Gagal muat naik. Sila semak konsol log.");
    }
}
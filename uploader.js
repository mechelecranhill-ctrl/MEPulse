async function uploadQuotationToR2(fileInputId, workIdValue, unitValue, statusDivId, hiddenUrlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusDivId);
    const hiddenUrlInput = document.getElementById(hiddenUrlInputId);
    if (!fileInput || !fileInput.files.length) {
        showAppToast("Please select a PDF file first!", "error");
        return;
    }
    workIdValue = (workIdValue || '').trim();
    if (!workIdValue) {
        showAppToast("Please make sure the Work ID is filled in!", "error");
        return;
    }
    const file = fileInput.files[0];
    const filename = `${workIdValue}.pdf`;
    if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0078d4";
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${filename}...`;
    }
    const workerBaseUrl = "https://uploader.mech-elec-ranhill.workers.dev"; 
    try {
        const response = await fetch(`${workerBaseUrl}/upload?filename=${encodeURIComponent(filename)}`, {
            method: "PUT",
            headers: {
                "Content-Type": file.type || "application/pdf"
            },
            body: file
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to upload file.");
        }
        if (hiddenUrlInput) {
            hiddenUrlInput.value = `${workerBaseUrl}/${result.objectKey}`;
        }
        if (statusDiv) {
            statusDiv.style.color = "#34C759";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> File uploaded successfully.`;
        }
        // Tiada popup di sini - satu-satunya popup dipaparkan oleh pemanggil (tqDoSubmit)
        // selepas keseluruhan proses (upload + simpan rekod) selesai.
    } catch (error) {
        console.error("Upload Error:", error);
        if (statusDiv) {
            statusDiv.style.color = "#FF3B30";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Error during upload.`;
        }
        // Tiada popup di sini juga - hiddenUrlInput akan kekal kosong, dan
        // tqDoSubmit() akan mengesan ini lalu memaparkan satu toast ralat.
    }
}

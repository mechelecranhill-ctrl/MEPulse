async function uploadQuotationToR2(fileInputId, workIdValue, unitValue, statusDivId, hiddenUrlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusDivId);
    const hiddenUrlInput = document.getElementById(hiddenUrlInputId);

    if (!fileInput || !fileInput.files.length) {
        alert("Please select a PDF file first!");
        return;
    }

    workIdValue = (workIdValue || '').trim();
    if (!workIdValue) {
        alert("Please make sure the Work ID is filled in!");
        return;
    }

    const file = fileInput.files[0];
    const filename = `${workIdValue}.pdf`;

    if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0078d4";
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${filename} to Cloudflare R2...`;
    }

    // Your ready-to-use Worker URL!
    const workerBaseUrl = "https://uploader.mech-elec-ranhill.workers.dev"; 

    try {
        // Send the file directly to the Worker R2
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

        // FIX: save a full, directly-openable URL instead of the bare R2
        // object key (e.g. "quotations/WORK123.pdf"). Storing just the key
        // meant <a href="..."> links resolved relative to whatever page
        // opened them (e.g. the GitHub Pages dashboard), producing a 404
        // there instead of loading the actual PDF from the Worker.
        if (hiddenUrlInput) {
            hiddenUrlInput.value = `${workerBaseUrl}/${result.objectKey}`;
        }

        if (statusDiv) {
            statusDiv.style.color = "#34C759";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Success! File saved to Cloudflare R2.`;
        }
        alert(`File for ${workIdValue} was successfully saved to Cloudflare R2!`);

    } catch (error) {
        console.error("R2 Upload Error:", error);
        if (statusDiv) {
            statusDiv.style.color = "#FF3B30";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Error during upload.`;
        }
        alert(`Upload failed: ${error.message}`);
    }
}
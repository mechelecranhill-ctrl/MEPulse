async function uploadQuotationToR2(fileInputId, workIdValue, unitValue, statusDivId, hiddenUrlInputId) {
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
    const filename = `${workIdValue}.pdf`;

    if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0078d4";
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memuat naik ${filename} ke Cloudflare R2...`;
    }

    // URL Worker anda yang baru siap!
    const workerBaseUrl = "https://uploader.mech-elec-ranhill.workers.dev"; 

    try {
        // Hantar fail terus ke Worker R2
        const response = await fetch(`${workerBaseUrl}/upload?filename=${encodeURIComponent(filename)}`, {
            method: "PUT",
            headers: {
                "Content-Type": file.type || "application/pdf"
            },
            body: file
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Gagal muat naik fail.");
        }

        // Simpan path fail (cth: quotations/WORK123.pdf) ke input tersembunyi
        if (hiddenUrlInput) {
            hiddenUrlInput.value = result.objectKey; 
        }

        if (statusDiv) {
            statusDiv.style.color = "#34C759";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Berjaya! Fail disimpan di Cloudflare R2.`;
        }
        alert(`Fail bagi ${workIdValue} berjaya disimpan di Cloudflare R2!`);

    } catch (error) {
        console.error("R2 Upload Error:", error);
        if (statusDiv) {
            statusDiv.style.color = "#FF3B30";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Ralat semasa muat naik.`;
        }
        alert(`Gagal muat naik: ${error.message}`);
    }
}
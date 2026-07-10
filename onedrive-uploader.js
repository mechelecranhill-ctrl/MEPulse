/**
 * Fungsi untuk menukar objek Fail (File) kepada teks Base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

/**
 * Fungsi Utama untuk Upload Fail ke Microsoft List -> OneDrive
 * @param {string} fileInputId   - ID bagi input jenis file (input type="file")
 * @param {string} workIdValue   - Nilai Work ID sebenar (cth: "C 123456"), BUKAN id elemen
 * @param {string} unitValue     - Nilai/nama Unit sebenar (cth: "Unit Kejuruteraan"), BUKAN id elemen
 * @param {string} statusDivId   - ID bagi elemen untuk tunjuk status loading/sukses
 * @param {string} hiddenUrlInputId - ID bagi hidden input untuk simpan nama fail ke DB (Supabase)
 */
async function uploadQuotationToOneDrive(fileInputId, workIdValue, unitValue, statusDivId, hiddenUrlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const statusDiv = document.getElementById(statusDivId);
    const hiddenUrlInput = document.getElementById(hiddenUrlInputId);

    // Semak jika komponen borang wujud
    if (!fileInput) {
        console.error("Ralat: ID input fail yang diberikan tidak wujud dalam HTML.");
        return;
    }

    workIdValue = (workIdValue || '').trim();

    // Validasi input wajib
    if (!workIdValue) {
        alert("Sila pastikan Work ID sudah diisi sebelum muat naik fail!");
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Sila pilih fail PDF terlebih dahulu!");
        return;
    }

    const file = fileInput.files[0];

    // Papar status loading
    if (statusDiv) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "#0078d4";
        statusDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses fail ${workIdValue}.pdf ke OneDrive...`;
    }

    // ⚠️ GANTI URL INI dengan URL Power Automate "When an item is created" (SharePoint/Lists API) anda
    // Format biasa akaun personal/kerja:
    // https://ranhill-my.sharepoint.com/personal/muhammad_iman_ranhill_com_my/_api/web/lists/getbytitle('Quotation Queue')/items
    const sharePointApiUrl = "https://ranhill-my.sharepoint.com/personal/muhammad_iman_ranhill_com_my/_api/web/lists/getbytitle('Quotation Queue')/items";

    try {
        // LANGKAH A: Cipta item baru di Microsoft List (Hantar Work ID & Unit)
        const itemResponse = await fetch(sharePointApiUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json;odata=verbose",
                "Content-Type": "application/json;odata=verbose"
            },
            body: JSON.stringify({
                "__metadata": { "type": "SP.Data.Quotation_x0020_QueueListItem" }, // Pastikan nama internal list betul
                "Title": workIdValue, // Menyimpan Work ID ke kolum Title
                "Unit": unitValue // Menyimpan pilihan unit ke kolum (Choice/Text)
            })
        });

        if (!itemResponse.ok) {
            throw new Error("Gagal mencipta rekod di Microsoft Lists.");
        }

        const itemData = await itemResponse.json();
        const itemId = itemData.d.Id; // Dapatkan ID item yang baru dicipta

        // LANGKAH B: Lampirkan (Attach) fail PDF ke dalam item tadi
        const attachmentUrl = `${sharePointApiUrl}(${itemId})/AttachmentFiles/add(FileName='${workIdValue}.pdf')`;

        const attachResponse = await fetch(attachmentUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json;odata=verbose"
            },
            body: file // Hantar fail binary asal terus sebagai body
        });

        if (!attachResponse.ok) {
            throw new Error("Gagal melampirkan fail ke item Lists.");
        }

        // LANGKAH C: Simpan nama fail ke hidden input untuk database anda (Supabase)
        if (hiddenUrlInput) {
            hiddenUrlInput.value = `${workIdValue}.pdf`;
        }

        // Kemaskini status kejayaan
        if (statusDiv) {
            statusDiv.style.color = "#34C759";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sukses! Fail OneDrive diproses dengan nama <strong>${workIdValue}.pdf</strong>`;
        }
        alert(`Fail PDF bagi ${workIdValue} berjaya di-upload dan disusun ke folder ${unitValue}!`);

    } catch (error) {
        console.error("Uploader Error:", error);
        if (statusDiv) {
            statusDiv.style.color = "#FF3B30";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Ralat berlaku semasa memproses fail.`;
        }
        alert("Gagal muat naik. Sila semak konsol log atau sambungan rangkaian.");
    }
}

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

/**
 * Arkibkan quotation QUO-REJ lama sebelum quotation baru didaftarkan.
 *
 * Cara kerja:
 * 1. Cari item Microsoft List sedia ada bagi work_id ini (Title = workId).
 * 2. Kira berapa banyak arkib "_REJECTEDx" sedia ada untuk work_id ini -> tentukan nombor seterusnya.
 * 3. Download fail PDF asal (attachment) sebagai blob.
 * 4. Cipta SATU item List arkib baru dengan Title = "{workId}_REJECTEDn" dan lampirkan
 *    salinan fail dengan nama "{workId}_REJECTEDn_{YYYYMMDD}.pdf".
 * 5. Padam item List ASAL (attachment asal turut terpadam serentak, tetapi salinan
 *    fail sudah selamat berada di item arkib pada langkah 4 -- jadi fail tidak hilang,
 *    cuma "dipindah/rename").
 *
 * @param {string} workIdValue - Work ID (cth: "C 123456")
 * @param {string} actionDate  - Tarikh reject (ISO string) dari column quotations.action_date
 */
async function archiveRejectedQuotation(workIdValue, actionDate) {
    workIdValue = (workIdValue || '').trim();
    if (!workIdValue) { console.warn("archiveRejectedQuotation: workIdValue kosong, langkau."); return; }

    const sharePointApiUrl = "https://ranhill-my.sharepoint.com/personal/muhammad_iman_ranhill_com_my/_api/web/lists/getbytitle('Quotation Queue')/items";
    const siteBaseUrl = sharePointApiUrl.split('/_api/')[0];
    const commonHeaders = { "Accept": "application/json;odata=verbose" };

    try {
        // 1. Cari item List sedia ada dengan Title = workId (item aktif yang rejected)
        const origRes = await fetch(`${sharePointApiUrl}?$filter=Title eq '${workIdValue}'`, { headers: commonHeaders });
        if (!origRes.ok) throw new Error("Gagal mencari item List asal.");
        const origData = await origRes.json();
        const origItem = origData.d?.results?.[0];

        if (!origItem) {
            console.warn(`archiveRejectedQuotation: Tiada item List untuk "${workIdValue}", langkau proses arkib.`);
            return;
        }

        // 2. Kira berapa banyak arkib REJECTED sedia ada -> tentukan nombor seterusnya
        const existingRes = await fetch(`${sharePointApiUrl}?$filter=startswith(Title,'${workIdValue}_REJECTED')`, { headers: commonHeaders });
        const existingData = existingRes.ok ? await existingRes.json() : { d: { results: [] } };
        const nextNum = (existingData.d?.results?.length || 0) + 1;

        // 3. Dapatkan attachment (fail PDF) item asal
        const attachListRes = await fetch(`${sharePointApiUrl}(${origItem.Id})/AttachmentFiles`, { headers: commonHeaders });
        if (!attachListRes.ok) throw new Error("Gagal mendapatkan senarai attachment.");
        const attachListData = await attachListRes.json();
        const attachment = attachListData.d?.results?.[0];

        if (!attachment) {
            console.warn(`archiveRejectedQuotation: Tiada attachment untuk "${workIdValue}", langkau proses arkib (item asal tidak dipadam).`);
            return;
        }

        // 4. Download fail asal sebagai blob
        const fileRes = await fetch(`${siteBaseUrl}/_api/web/GetFileByServerRelativeUrl('${attachment.ServerRelativeUrl}')/$value`, { headers: commonHeaders });
        if (!fileRes.ok) throw new Error("Gagal memuat turun fail asal.");
        const fileBlob = await fileRes.blob();

        // 5. Bina nama fail baru: workId_REJECTEDn_YYYYMMDD
        const d = actionDate ? new Date(actionDate) : new Date();
        const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const archiveTitle = `${workIdValue}_REJECTED${nextNum}`;
        const newFileName = `${archiveTitle}_${dateStr}.pdf`;

        // 6. Cipta item List arkib baru
        const newItemRes = await fetch(sharePointApiUrl, {
            method: "POST",
            headers: { ...commonHeaders, "Content-Type": "application/json;odata=verbose" },
            body: JSON.stringify({
                "__metadata": { "type": "SP.Data.Quotation_x0020_QueueListItem" },
                "Title": archiveTitle,
                "Unit": origItem.Unit || ''
            })
        });
        if (!newItemRes.ok) throw new Error("Gagal mencipta item List arkib.");
        const newItemData = await newItemRes.json();
        const newItemId = newItemData.d.Id;

        // 7. Lampirkan fail (dengan nama baru) ke item arkib
        const newAttachRes = await fetch(`${sharePointApiUrl}(${newItemId})/AttachmentFiles/add(FileName='${newFileName}')`, {
            method: "POST",
            headers: commonHeaders,
            body: fileBlob
        });
        if (!newAttachRes.ok) throw new Error("Gagal melampirkan fail arkib.");

        // 8. Padam item List ASAL (fail sudah selamat disalin ke item arkib di langkah 6-7)
        const deleteRes = await fetch(`${sharePointApiUrl}(${origItem.Id})`, {
            method: "POST",
            headers: { ...commonHeaders, "X-HTTP-Method": "DELETE", "IF-MATCH": "*" }
        });
        if (!deleteRes.ok) {
            console.warn(`archiveRejectedQuotation: Fail diarkibkan (${newFileName}) tetapi gagal padam item List asal "${workIdValue}". Sila padam manual.`);
        }

        console.log(`archiveRejectedQuotation: Berjaya arkibkan sebagai "${newFileName}"`);
    } catch (err) {
        console.error("archiveRejectedQuotation: Ralat semasa arkibkan quotation rejected ->", err);
        throw err;
    }
}
// js/modules/mail.js
import { store } from './store.js';
import { showToast, closeModals, playNotification } from './ui.js';

export async function fetchAvailableDomains() {
    const domainSelect = document.getElementById('domainSelect');
    try {
        const domainRes = await fetch(`${store.API_BASE}/domains?page=1`);
        const domainData = await domainRes.json();
        const domains = domainData['hydra:member'];
        
        domainSelect.innerHTML = '';
        domains.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.domain;
            opt.innerText = `@${d.domain}`;
            domainSelect.appendChild(opt);
        });
    } catch (err) {
        domainSelect.innerHTML = '<option value="">Gagal memuat domain</option>';
    }
}

export async function authenticateAccount(email, password, isNewLogin = false) {
    const emailInput = document.getElementById('emailInput');
    const statusText = document.getElementById('statusText');
    try {
        const tokenRes = await fetch(`${store.API_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });
        if (!tokenRes.ok) throw new Error("Unauthorized");
        const tokenData = await tokenRes.json();
        
        store.currentToken = tokenData.token;
        store.currentAccountId = tokenData.id;
        store.currentEmail = email;
        store.currentPassword = password;
        
        localStorage.setItem('tm_email', store.currentEmail);
        localStorage.setItem('tm_pass', store.currentPassword);

        emailInput.value = store.currentEmail;
        document.getElementById('displayCurrentEmail').innerText = store.currentEmail;
        document.getElementById('displayCurrentPassword').innerText = store.currentPassword;
        statusText.innerText = "Terhubung! Menunggu pesan masuk...";
        
        if(isNewLogin) store.knownEmailIds.clear();
        checkInbox();
        startCountdown();
        return true;
    } catch (err) {
        if (!isNewLogin) generateNewEmail();
        return false;
    }
}

export async function generateNewEmail(isManual = false) {
    clearInterval(store.countdownInterval);
    document.getElementById('emailInput').value = "Membuat alamat...";
    document.getElementById('statusText').innerText = "Mendaftarkan akun...";
    showEmptyInbox();
    
    try {
        let domain = document.getElementById('domainSelect').value;
        if (!domain) {
            await fetchAvailableDomains();
            domain = document.getElementById('domainSelect').value;
        }

        let prefix = document.getElementById('customPrefix').value.trim();
        if (!prefix) prefix = Math.random().toString(36).substring(2, 10);
        prefix = prefix.replace(/[^a-zA-Z0-9.\-_]/g, '');

        const newEmail = `${prefix}@${domain}`;
        const newPass = Math.random().toString(36).slice(-8) + "A1!";

        const res = await fetch(`${store.API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: newEmail, password: newPass })
        });

        if (!res.ok) throw new Error("Gagal membuat email");

        await authenticateAccount(newEmail, newPass, true);
        if (isManual) showToast(`Email ${newEmail} berhasil dibuat!`);
        document.getElementById('customPrefix').value = '';
    } catch (err) {
        document.getElementById('statusText').innerText = "Gagal. Nama mungkin sudah dipakai.";
        if (isManual) showToast("Nama email sudah digunakan atau tidak valid!", "error");
        else generateNewEmail();
    }
}

export async function loginAccount() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if(!email || !pass) return showToast("Isi email dan password!", "error");
    
    closeModals();
    document.getElementById('emailInput').value = "Memeriksa kredensial...";
    const success = await authenticateAccount(email, pass, true);
    if(success) {
        const loggedDomain = email.split('@')[1];
        if (loggedDomain) document.getElementById('domainSelect').value = loggedDomain;
        showToast("Berhasil login!");
    } else {
        showToast("Login gagal! Sesi mungkin kedaluwarsa.", "error");
    }
}

export async function deleteAccount() {
    if (!confirm("PERINGATAN: Ini akan menghapus alamat email dan SEMUA pesan Anda secara permanen. Lanjutkan?")) return;
    showToast("Menghancurkan akun...");
    try {
        const res = await fetch(`${store.API_BASE}/accounts/${store.currentAccountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${store.currentToken}` }
        });
        if (res.ok || res.status === 204) {
            showToast("Akun berhasil dihancurkan!");
            closeModals();
            localStorage.removeItem('tm_email');
            localStorage.removeItem('tm_pass');
            generateNewEmail();
        } else { throw new Error("Gagal"); }
    } catch (err) { showToast("Gagal menghancurkan akun!", "error"); }
}

export function manualRefresh() {
    showToast("Memperbarui kotak masuk...");
    checkInbox();
    startCountdown();
}

export function showEmptyInbox() {
    document.getElementById('inbox').innerHTML = `<div class="p-16 text-center text-gray-500"><i class="ph ph-envelope-open text-6xl mb-3 opacity-30"></i><p>Kotak masuk Anda kosong</p></div>`;
    document.getElementById('emailCount').classList.add('hidden');
}

export async function checkInbox() {
    if(!store.currentToken) return;
    try {
        const res = await fetch(`${store.API_BASE}/messages`, { headers: { 'Authorization': `Bearer ${store.currentToken}` } });
        const data = await res.json();
        const emails = data['hydra:member'];
        
        let hasNew = false;
        emails.forEach(e => {
            if (!store.knownEmailIds.has(e.id)) { store.knownEmailIds.add(e.id); hasNew = true; }
        });

        if (hasNew && emails.length > 0) playNotification(emails[0].from.address, emails[0].subject);
        renderInbox(emails);
    } catch (err) {}
}

export function renderInbox(emails) {
    if (emails.length === 0) return showEmptyInbox();
    document.getElementById('emailCount').innerText = `${emails.length} Pesan`;
    document.getElementById('emailCount').classList.remove('hidden');

    let html = '';
    emails.forEach(email => {
        const timeStr = new Date(email.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const attachIcon = email.hasAttachments ? `<i class="ph-fill ph-paperclip text-gray-400"></i>` : '';
        html += `
            <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-4 border-transparent hover:border-primary" onclick="window.readEmail('${email.id}')">
                <div class="flex items-start gap-3 overflow-hidden w-full">
                    <div class="bg-primary/10 text-primary p-3 rounded-full flex-shrink-0"><i class="ph-fill ph-envelope-simple text-xl"></i></div>
                    <div class="truncate w-full">
                        <h4 class="font-bold text-gray-800 dark:text-gray-100 truncate">${email.from.address}</h4>
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">${email.subject || '(Tanpa Subjek)'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                    ${attachIcon} <span class="text-xs font-semibold text-gray-400">${timeStr}</span>
                    <i class="ph ph-caret-right text-gray-300 group-hover:text-primary transition transform group-hover:translate-x-1"></i>
                </div>
            </div>`;
    });
    document.getElementById('inbox').innerHTML = html;
}

export async function readEmail(id) {
    clearInterval(store.countdownInterval);
    document.getElementById('refreshProgress').style.width = '0%';
    const inboxContainer = document.getElementById('inbox');
    inboxContainer.innerHTML = `<div class="p-16 text-center text-primary"><i class="ph ph-spinner-gap animate-spin text-4xl mx-auto"></i><p class="mt-4">Memuat pesan & lampiran...</p></div>`;
    
    try {
        const res = await fetch(`${store.API_BASE}/messages/${id}`, { headers: { 'Authorization': `Bearer ${store.currentToken}` }});
        const msg = await res.json();
        const bodyContent = msg.html && msg.html.length > 0 ? msg.html[0] : (msg.text ? msg.text.replace(/\n/g, '<br>') : 'Pesan kosong');

        let attachmentsHtml = '';
        if (msg.hasAttachments && msg.attachments && msg.attachments.length > 0) {
            attachmentsHtml = `<div class="mt-8 border-t dark:border-gray-700 pt-6"><h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="ph ph-paperclip"></i> Lampiran File (${msg.attachments.length})</h4><div class="flex flex-wrap gap-3">`;
            msg.attachments.forEach(att => {
                const sizeKb = (att.size / 1024).toFixed(1);
                attachmentsHtml += `
                    <button onclick="window.downloadAttachment('${msg.id}', '${att.id}', '${att.filename}')" class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 transition text-sm shadow-sm">
                        <i class="ph-fill ph-file text-primary text-xl"></i>
                        <div class="text-left"><p class="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] leading-tight">${att.filename}</p><p class="text-xs text-gray-400 mt-1">${sizeKb} KB</p></div>
                        <i class="ph ph-download-simple ml-2 text-gray-400"></i>
                    </button>`;
            });
            attachmentsHtml += `</div></div>`;
        }

        const safeSubject = (msg.subject || 'pesan').replace(/[^a-zA-Z0-9]/g, '_');
        inboxContainer.innerHTML = `
            <div class="p-6 md:p-8 email-container">
                <div class="flex justify-between items-center mb-6 gap-2 flex-wrap">
                    <button onclick="window.backToInbox()" class="text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium"><i class="ph ph-arrow-left"></i> Kembali</button>
                    <div class="flex gap-2">
                        <button onclick="window.downloadEml('${msg.id}', '${safeSubject}')" class="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium"><i class="ph ph-download-simple"></i> .EML</button>
                        <button onclick="window.deleteEmail('${msg.id}')" class="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium"><i class="ph ph-trash"></i> Hapus</button>
                    </div>
                </div>
                <h2 class="text-2xl font-extrabold mb-4">${msg.subject || '(Tanpa Subjek)'}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between md:items-center gap-2 border border-gray-100 dark:border-gray-700">
                    <div><span class="text-sm text-gray-500 block">Dari:</span><span class="font-bold">${msg.from.address}</span></div>
                    <div class="text-sm text-gray-500">${new Date(msg.createdAt).toLocaleString('id-ID')}</div>
                </div>
                <div class="email-body prose dark:prose-invert max-w-none break-words bg-white dark:bg-darkcard p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner overflow-x-auto">${bodyContent}</div>
                ${attachmentsHtml}
            </div>`;
    } catch (err) { inboxContainer.innerHTML = `<div class="p-8 text-center text-red-500">Gagal memuat pesan.</div>`; }
}

export async function downloadEml(id, safeSubject) {
    showToast("Mengunduh EML...");
    try {
        const res = await fetch(`${store.API_BASE}/messages/${id}/download`, { headers: { 'Authorization': `Bearer ${store.currentToken}` } });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${safeSubject}.eml`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); a.remove();
    } catch (err) { showToast("Gagal mengunduh file EML", "error"); }
}

export async function deleteEmail(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini secara permanen?")) return;
    showToast("Menghapus pesan...");
    try {
        const res = await fetch(`${store.API_BASE}/messages/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${store.currentToken}` } });
        if (res.ok || res.status === 204) {
            showToast("Pesan berhasil dimusnahkan!");
            store.knownEmailIds.delete(id); 
            backToInbox();
        } else { throw new Error("Gagal"); }
    } catch (err) { showToast("Gagal menghapus pesan dari server!", "error"); }
}

export async function downloadAttachment(msgId, attId, filename) {
    showToast("Memproses unduhan...");
    try {
        const res = await fetch(`${store.API_BASE}/messages/${msgId}/attachments/${attId}`, { headers: { 'Authorization': `Bearer ${store.currentToken}` } });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); a.remove();
        showToast("File berhasil diunduh!");
    } catch (err) { showToast("Gagal mengunduh file!", "error"); }
}

export function backToInbox() {
    checkInbox();
    startCountdown();
}

export function startCountdown() {
    clearInterval(store.countdownInterval);
    let timer = 0;
    const progress = document.getElementById('refreshProgress');
    store.countdownInterval = setInterval(() => {
        timer++;
        progress.style.width = `${(timer / 100) * 100}%`;
        if (timer >= 100) { checkInbox(); timer = 0; }
    }, 100);
}
// script.js

const html = document.documentElement;
if (localStorage.getItem('theme') === 'light') html.classList.remove('dark');
document.getElementById('themeToggle').addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
});

const API_BASE = 'https://api.mail.tm';
let currentEmail = '', currentPassword = '', currentToken = '', currentAccountId = '';
let countdownInterval;
let knownEmailIds = new Set();
let isNotificationsEnabled = false;

const emailInput = document.getElementById('emailInput');
const inboxContainer = document.getElementById('inbox');
const statusText = document.getElementById('statusText');
const refreshProgress = document.getElementById('refreshProgress');
const domainSelect = document.getElementById('domainSelect');
const customPrefixInput = document.getElementById('customPrefix');

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

async function fetchAvailableDomains() {
    try {
        const domainRes = await fetch(`${API_BASE}/domains?page=1`);
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

async function initApp() {
    await fetchAvailableDomains();
    const savedEmail = localStorage.getItem('tm_email');
    const savedPass = localStorage.getItem('tm_pass');
    
    if (savedEmail && savedPass) {
        const savedDomain = savedEmail.split('@')[1];
        if (savedDomain) domainSelect.value = savedDomain;
        await authenticateAccount(savedEmail, savedPass, false);
    } else {
        await generateNewEmail();
    }
}

// Fitur Baru: Mendukung Custom Prefix
async function generateNewEmail(isManual = false) {
    clearInterval(countdownInterval);
    emailInput.value = "Membuat alamat...";
    statusText.innerText = "Mendaftarkan akun...";
    showEmptyInbox();
    
    try {
        let domain = domainSelect.value;
        if (!domain) {
            await fetchAvailableDomains();
            domain = domainSelect.value;
        }

        // Ambil dari input custom, jika kosong gunakan acak
        let prefix = customPrefixInput.value.trim();
        if (!prefix) {
            prefix = Math.random().toString(36).substring(2, 10);
        }
        
        // Validasi agar hanya huruf, angka, titik, strip, dan underscore yang lolos
        prefix = prefix.replace(/[^a-zA-Z0-9.\-_]/g, '');

        const newEmail = `${prefix}@${domain}`;
        const newPass = Math.random().toString(36).slice(-8) + "A1!";

        const res = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: newEmail, password: newPass })
        });

        if (!res.ok) throw new Error("Gagal membuat email");

        await authenticateAccount(newEmail, newPass, true);
        if (isManual) showToast(`Email ${newEmail} berhasil dibuat!`);
        customPrefixInput.value = ''; // Reset input
    } catch (err) {
        statusText.innerText = "Gagal. Nama mungkin sudah dipakai.";
        if (isManual) showToast("Nama email sudah digunakan atau tidak valid!", "error");
        else generateNewEmail(); // Jika generate otomatis gagal (sangat jarang), coba lagi
    }
}

async function loginAccount() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    if(!email || !pass) return showToast("Isi email dan password!", "error");
    
    closeModals();
    emailInput.value = "Memeriksa kredensial...";
    const success = await authenticateAccount(email, pass, true);
    if(success) {
        const loggedDomain = email.split('@')[1];
        if (loggedDomain) domainSelect.value = loggedDomain;
        showToast("Berhasil login!");
    } else {
        showToast("Login gagal! Sesi mungkin kedaluwarsa.", "error");
    }
}

async function authenticateAccount(email, password, isNewLogin = false) {
    try {
        const tokenRes = await fetch(`${API_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });
        if (!tokenRes.ok) throw new Error("Unauthorized");
        const tokenData = await tokenRes.json();
        
        currentToken = tokenData.token;
        currentAccountId = tokenData.id; // Disimpan untuk fungsi Hancurkan Akun
        currentEmail = email;
        currentPassword = password;
        
        localStorage.setItem('tm_email', currentEmail);
        localStorage.setItem('tm_pass', currentPassword);

        emailInput.value = currentEmail;
        document.getElementById('displayCurrentEmail').innerText = currentEmail;
        document.getElementById('displayCurrentPassword').innerText = currentPassword;
        statusText.innerText = "Terhubung! Menunggu pesan masuk...";
        
        if(isNewLogin) knownEmailIds.clear();
        checkInbox();
        startCountdown();
        return true;
    } catch (err) {
        if (!isNewLogin) generateNewEmail();
        return false;
    }
}

// Fitur Baru: Refresh Manual
function manualRefresh() {
    showToast("Memperbarui kotak masuk...");
    checkInbox();
    startCountdown();
}

function showEmptyInbox() {
    inboxContainer.innerHTML = `<div class="p-16 text-center text-gray-500"><i class="ph ph-envelope-open text-6xl mb-3 opacity-30"></i><p>Kotak masuk Anda kosong</p></div>`;
    document.getElementById('emailCount').classList.add('hidden');
}

async function checkInbox() {
    if(!currentToken) return;
    try {
        const res = await fetch(`${API_BASE}/messages`, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await res.json();
        const emails = data['hydra:member'];
        
        let hasNew = false;
        emails.forEach(e => {
            if (!knownEmailIds.has(e.id)) { knownEmailIds.add(e.id); hasNew = true; }
        });

        if (hasNew && emails.length > 0) playNotification(emails[0].from.address, emails[0].subject);
        renderInbox(emails);
    } catch (err) {}
}

function renderInbox(emails) {
    if (emails.length === 0) return showEmptyInbox();
    document.getElementById('emailCount').innerText = `${emails.length} Pesan`;
    document.getElementById('emailCount').classList.remove('hidden');

    let html = '';
    emails.forEach(email => {
        const timeStr = new Date(email.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const attachIcon = email.hasAttachments ? `<i class="ph-fill ph-paperclip text-gray-400"></i>` : '';
        
        html += `
            <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-4 border-transparent hover:border-primary" onclick="readEmail('${email.id}')">
                <div class="flex items-start gap-3 overflow-hidden w-full">
                    <div class="bg-primary/10 text-primary p-3 rounded-full flex-shrink-0">
                        <i class="ph-fill ph-envelope-simple text-xl"></i>
                    </div>
                    <div class="truncate w-full">
                        <h4 class="font-bold text-gray-800 dark:text-gray-100 truncate">${email.from.address}</h4>
                        <p class="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">${email.subject || '(Tanpa Subjek)'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                    ${attachIcon}
                    <span class="text-xs font-semibold text-gray-400">${timeStr}</span>
                    <i class="ph ph-caret-right text-gray-300 group-hover:text-primary transition transform group-hover:translate-x-1"></i>
                </div>
            </div>`;
    });
    inboxContainer.innerHTML = html;
}

async function readEmail(id) {
    clearInterval(countdownInterval);
    refreshProgress.style.width = '0%';
    inboxContainer.innerHTML = `<div class="p-16 text-center text-primary"><i class="ph ph-spinner-gap animate-spin text-4xl mx-auto"></i><p class="mt-4">Memuat pesan & lampiran...</p></div>`;
    
    try {
        const res = await fetch(`${API_BASE}/messages/${id}`, { headers: { 'Authorization': `Bearer ${currentToken}` }});
        const msg = await res.json();
        
        const bodyContent = msg.html && msg.html.length > 0 ? msg.html[0] : (msg.text ? msg.text.replace(/\n/g, '<br>') : 'Pesan kosong');

        let attachmentsHtml = '';
        if (msg.hasAttachments && msg.attachments && msg.attachments.length > 0) {
            attachmentsHtml = `<div class="mt-8 border-t dark:border-gray-700 pt-6">
                <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i class="ph ph-paperclip"></i> Lampiran File (${msg.attachments.length})
                </h4>
                <div class="flex flex-wrap gap-3">`;
            
            msg.attachments.forEach(att => {
                const sizeKb = (att.size / 1024).toFixed(1);
                attachmentsHtml += `
                    <button onclick="downloadAttachment('${msg.id}', '${att.id}', '${att.filename}')" 
                        class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 transition text-sm shadow-sm">
                        <i class="ph-fill ph-file text-primary text-xl"></i>
                        <div class="text-left">
                            <p class="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] leading-tight">${att.filename}</p>
                            <p class="text-xs text-gray-400 mt-1">${sizeKb} KB</p>
                        </div>
                        <i class="ph ph-download-simple ml-2 text-gray-400"></i>
                    </button>`;
            });
            attachmentsHtml += `</div></div>`;
        }

        // Fitur Baru: Ditambahkan tombol Download EML di samping tombol Hapus
        const safeSubject = (msg.subject || 'pesan').replace(/[^a-zA-Z0-9]/g, '_');
        inboxContainer.innerHTML = `
            <div class="p-6 md:p-8 email-container">
                <div class="flex justify-between items-center mb-6 gap-2 flex-wrap">
                    <button onclick="backToInbox()" class="text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium">
                        <i class="ph ph-arrow-left"></i> Kembali
                    </button>
                    <div class="flex gap-2">
                        <button onclick="downloadEml('${msg.id}', '${safeSubject}')" class="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium">
                            <i class="ph ph-download-simple"></i> .EML
                        </button>
                        <button onclick="deleteEmail('${msg.id}')" class="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium">
                            <i class="ph ph-trash"></i> Hapus
                        </button>
                    </div>
                </div>
                <h2 class="text-2xl font-extrabold mb-4">${msg.subject || '(Tanpa Subjek)'}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between md:items-center gap-2 border border-gray-100 dark:border-gray-700">
                    <div><span class="text-sm text-gray-500 block">Dari:</span><span class="font-bold">${msg.from.address}</span></div>
                    <div class="text-sm text-gray-500">${new Date(msg.createdAt).toLocaleString('id-ID')}</div>
                </div>
                
                <div class="email-body prose dark:prose-invert max-w-none break-words bg-white dark:bg-darkcard p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner overflow-x-auto">
                    ${bodyContent}
                </div>
                
                ${attachmentsHtml}
            </div>`;
    } catch (err) {
        inboxContainer.innerHTML = `<div class="p-8 text-center text-red-500">Gagal memuat pesan.</div>`;
    }
}

// Fitur Baru: Mengunduh EML
async function downloadEml(id, safeSubject) {
    showToast("Mengunduh EML...");
    try {
        const res = await fetch(`${API_BASE}/messages/${id}/download`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeSubject}.eml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (err) {
        showToast("Gagal mengunduh file EML", "error");
    }
}

async function deleteEmail(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini secara permanen?")) return;
    
    showToast("Menghapus pesan...");
    try {
        const res = await fetch(`${API_BASE}/messages/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok || res.status === 204) {
            showToast("Pesan berhasil dimusnahkan!");
            knownEmailIds.delete(id); 
            backToInbox();
        } else {
            throw new Error("Gagal");
        }
    } catch (err) {
        showToast("Gagal menghapus pesan dari server!", "error");
    }
}

// Fitur Baru: Hancurkan Akun
async function deleteAccount() {
    if (!confirm("PERINGATAN: Ini akan menghapus alamat email dan SEMUA pesan Anda secara permanen. Lanjutkan?")) return;
    
    showToast("Menghancurkan akun...");
    try {
        const res = await fetch(`${API_BASE}/accounts/${currentAccountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (res.ok || res.status === 204) {
            showToast("Akun berhasil dihancurkan!");
            closeModals();
            localStorage.removeItem('tm_email');
            localStorage.removeItem('tm_pass');
            generateNewEmail();
        } else {
            throw new Error("Gagal");
        }
    } catch (err) {
        showToast("Gagal menghancurkan akun!", "error");
    }
}

// Fitur Baru: Tampilkan QR Code via API eksternal yang ringan
function showQRCode() {
    if(!currentEmail) return;
    document.getElementById('qrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentEmail)}`;
    document.getElementById('qrModal').classList.add('active');
}

async function downloadAttachment(msgId, attId, filename) {
    showToast("Memproses unduhan...");
    try {
        const res = await fetch(`${API_BASE}/messages/${msgId}/attachments/${attId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast("File berhasil diunduh!");
    } catch (err) {
        showToast("Gagal mengunduh file!", "error");
    }
}

function backToInbox() {
    checkInbox();
    startCountdown();
}

function startCountdown() {
    clearInterval(countdownInterval);
    let timer = 0;
    countdownInterval = setInterval(() => {
        timer++;
        refreshProgress.style.width = `${(timer / 100) * 100}%`;
        if (timer >= 100) { checkInbox(); timer = 0; }
    }, 100);
}

function showToast(msg, type = "success") {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    
    document.getElementById('toastMessage').innerText = msg;
    if (type === "error") {
        icon.className = "ph-fill ph-x-circle text-red-400 text-xl";
    } else {
        icon.className = "ph-fill ph-check-circle text-green-400 text-xl";
    }
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyText(elementId, isInput = false) {
    const text = isInput ? document.getElementById(elementId).value : document.getElementById(elementId).innerText;
    if(!text || text.includes("Memuat") || text.includes("Menyambungkan")) return;
    navigator.clipboard.writeText(text).then(() => showToast("Tersalin ke clipboard!"));
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission().then(p => {
            if (p === "granted") {
                isNotificationsEnabled = true;
                document.getElementById('bellIcon').classList.replace('text-yellow-500', 'text-green-500');
                showToast("Notifikasi aktif!");
            }
        });
    }
}

function playNotification(from, subject) {
    document.getElementById('notifySound').play().catch(()=>{});
    if (isNotificationsEnabled && "Notification" in window && Notification.permission === "granted") {
        new Notification("Email Masuk!", { body: `Dari: ${from}\nSubjek: ${subject || 'Tanpa subjek'}` });
    }
}

initApp();
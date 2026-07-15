// js/script.js
import { initTheme, closeModals, copyText, requestNotificationPermission, showQRCode } from './modules/ui.js';
import { 
    fetchAvailableDomains, authenticateAccount, generateNewEmail, 
    loginAccount, deleteAccount, manualRefresh, readEmail, 
    downloadEml, deleteEmail, downloadAttachment, backToInbox 
} from './modules/mail.js';

// 1. Inisialisasi Tema
initTheme();

// 2. Ekspos fungsi ke global `window` agar bisa dipanggil oleh onclick di HTML
window.closeModals = closeModals;
window.copyText = copyText;
window.requestNotificationPermission = requestNotificationPermission;
window.showQRCode = showQRCode;

window.generateNewEmail = generateNewEmail;
window.loginAccount = loginAccount;
window.deleteAccount = deleteAccount;
window.manualRefresh = manualRefresh;
window.readEmail = readEmail;
window.downloadEml = downloadEml;
window.deleteEmail = deleteEmail;
window.downloadAttachment = downloadAttachment;
window.backToInbox = backToInbox;

// 3. Fungsi Startup Aplikasi
async function initApp() {
    await fetchAvailableDomains();
    const savedEmail = localStorage.getItem('tm_email');
    const savedPass = localStorage.getItem('tm_pass');
    
    if (savedEmail && savedPass) {
        const savedDomain = savedEmail.split('@')[1];
        if (savedDomain) document.getElementById('domainSelect').value = savedDomain;
        await authenticateAccount(savedEmail, savedPass, false);
    } else {
        await generateNewEmail();
    }
}

// Mulai jalankan aplikasi
initApp();
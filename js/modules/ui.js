// js/modules/ui.js
import { store } from './store.js';

export function initTheme() {
    const html = document.documentElement;
    if (localStorage.getItem('theme') === 'light') html.classList.remove('dark');
    document.getElementById('themeToggle').addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    });
}

export function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

export function showToast(msg, type = "success") {
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

export function copyText(elementId, isInput = false) {
    const text = isInput ? document.getElementById(elementId).value : document.getElementById(elementId).innerText;
    if(!text || text.includes("Memuat") || text.includes("Menyambungkan")) return;
    navigator.clipboard.writeText(text).then(() => showToast("Tersalin ke clipboard!"));
}

export function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission().then(p => {
            if (p === "granted") {
                store.isNotificationsEnabled = true;
                document.getElementById('bellIcon').classList.replace('text-yellow-500', 'text-green-500');
                showToast("Notifikasi aktif!");
            }
        });
    }
}

export function playNotification(from, subject) {
    document.getElementById('notifySound').play().catch(()=>{});
    if (store.isNotificationsEnabled && "Notification" in window && Notification.permission === "granted") {
        new Notification("Email Masuk!", { body: `Dari: ${from}\nSubjek: ${subject || 'Tanpa subjek'}` });
    }
}

export function showQRCode() {
    if(!store.currentEmail) return;
    document.getElementById('qrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(store.currentEmail)}`;
    document.getElementById('qrModal').classList.add('active');
}
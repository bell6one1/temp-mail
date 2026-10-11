// js/providers/mailtm.js
const BASE = 'https://api.mail.tm';
// Menggunakan proxy AllOrigins sebagai pengganti corsproxy.io
const PROXY = 'https://api.allorigins.win/raw?url=';

export const mailtm = {
    name: 'Mail.tm (Utama)',
    
    async getDomains() {
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/domains?page=1')}`);
        if (!res.ok) throw new Error("Server Mail.tm bermasalah");
        const data = await res.json();
        return data['hydra:member'].map(d => d.domain);
    },
    
    async createAccount(email, password) {
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/accounts')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password })
        });
        if (!res.ok) throw new Error("Gagal registrasi di Mail.tm");
        return await res.json();
    },
    
    async getToken(email, password) {
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/token')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password })
        });
        if (!res.ok) throw new Error("Autentikasi Mail.tm gagal");
        return await res.json();
    },
    
    async getMessages(token) {
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/messages')}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await res.json();
        return data['hydra:member'];
    },
    
    async getMessage(token, id) {
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/messages/' + id)}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        return await res.json();
    },
    
    async deleteMessage(token, id) {
        return await fetch(`${PROXY}${encodeURIComponent(BASE + '/messages/' + id)}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
    },
    
    async downloadEml(token, id) {
        return await fetch(`${PROXY}${encodeURIComponent(BASE + '/messages/' + id + '/download')}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
    },
    
    async deleteAccount(token, accountId) {
        return await fetch(`${PROXY}${encodeURIComponent(BASE + '/accounts/' + accountId)}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
    },
    
    async downloadAttachment(token, msgId, attId) {
        return await fetch(`${PROXY}${encodeURIComponent(BASE + '/messages/' + msgId + '/attachments/' + attId)}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
    }
};
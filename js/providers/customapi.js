// js/providers/customapi.js
// Ganti URL ini saat Anda sudah memiliki server/API pribadi
const BASE = 'https://api.domain-pribadi-anda.com';

export const customapi = {
    name: 'Server Pribadi (Provider Ke-4)',
    
    async getDomains() {
        // Hapus throw error ini jika backend Anda sudah siap
        throw new Error("Backend pribadi belum dikonfigurasi.");
        
        /* Contoh jika sudah siap:
        const res = await fetch(`${BASE}/domains`);
        const data = await res.json();
        return data.domains;
        */
    },
    
    async createAccount(email, password) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async getToken(email, password) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async getMessages(token) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async getMessage(token, id) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async deleteMessage(token, id) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async downloadEml(token, id) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async deleteAccount(token, accountId) {
        throw new Error("Belum dikonfigurasi.");
    },
    
    async downloadAttachment(token, msgId, attId) {
        throw new Error("Belum dikonfigurasi.");
    }
};
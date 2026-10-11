// js/providers/tempmaillol.js
const BASE = 'https://api.tempmail.lol/v2';
const PROXY = 'https://corsproxy.io/?'; // Tambahkan jembatan proxy

export const tempmaillol = {
    name: 'TempMail.lol (Provider Ke-5)',
    
    async getDomains() {
        return ['tempmail.lol']; 
    },
    
    async createAccount(email, password) {
        // Bungkus URL dengan Proxy dan encodeURIComponent
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/inbox/create')}`);
        if (!res.ok) throw new Error("Server TempMail.lol bermasalah atau proxy diblokir");
        const data = await res.json();
        
        return { address: data.address, id: data.token, token: data.token };
    },
    
    async getToken(email, password) {
        return { token: password, id: password };
    },
    
    async getMessages(token) {
        // Bungkus URL dengan Proxy
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/inbox?token=' + token)}`);
        const data = await res.json();
        
        if (!data.emails) return [];

        return data.emails.map(msg => ({
            id: msg.id || Math.random().toString(36).substr(2, 9),
            from: { address: msg.from },
            subject: msg.subject,
            createdAt: msg.date,
            hasAttachments: false,
            rawEmail: msg 
        }));
    },
    
    async getMessage(token, id) {
        // Bungkus URL dengan Proxy
        const res = await fetch(`${PROXY}${encodeURIComponent(BASE + '/inbox?token=' + token)}`);
        const data = await res.json();
        const msg = data.emails.find(e => (e.id || '') === id) || data.emails[0];
        
        return {
            id: id,
            from: { address: msg.from },
            subject: msg.subject,
            createdAt: msg.date,
            html: [msg.html], 
            text: msg.text,
            hasAttachments: false,
            attachments: [] 
        };
    },
    
    async deleteMessage(token, id) {
        return new Response(null, { status: 204 });
    },
    
    async downloadEml(token, id) {
        throw new Error("Format EML tidak didukung oleh penyedia ini.");
    },
    
    async deleteAccount(token, accountId) {
        return new Response(null, { status: 204 });
    },
    
    async downloadAttachment(token, msgId, attId) {
        throw new Error("Unduhan lampiran tidak didukung oleh penyedia ini.");
    }
};

// js/providers/onesecmail.js
const BASE = 'https://www.1secmail.com/api/v1';

export const onesecmail = {
    name: '1secmail (Provider Ke-3)',
    
    async getDomains() {
        const res = await fetch(`${BASE}/?action=getDomainList`);
        if (!res.ok) throw new Error("Server 1secmail bermasalah");
        return await res.json();
    },
    
    // 1secmail tidak butuh registrasi. Kita hanya perlu mengembalikan data seolah-olah sukses.
    async createAccount(email, password) {
        return { address: email, id: email };
    },
    
    // 1secmail tidak pakai token/password. Kita gunakan alamat emailnya sebagai "token".
    async getToken(email, password) {
        return { token: email, id: email };
    },
    
    async getMessages(token) {
        const [login, domain] = token.split('@');
        const res = await fetch(`${BASE}/?action=getMessages&login=${login}&domain=${domain}`);
        const data = await res.json();
        
        // Konversi format 1secmail agar sama dengan Mail.tm
        return data.map(msg => ({
            id: msg.id.toString(),
            from: { address: msg.from },
            subject: msg.subject,
            createdAt: msg.date,
            hasAttachments: true // 1secmail tidak memberi info ini di list, kita set true agar ikon bisa muncul
        }));
    },
    
    async getMessage(token, id) {
        const [login, domain] = token.split('@');
        const res = await fetch(`${BASE}/?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
        const data = await res.json();
        
        // Konversi detail pesan 1secmail ke format Mail.tm
        return {
            id: data.id.toString(),
            from: { address: data.from },
            subject: data.subject,
            createdAt: data.date,
            html: [data.htmlBody],
            text: data.textBody,
            hasAttachments: data.attachments && data.attachments.length > 0,
            attachments: (data.attachments || []).map(att => ({
                id: att.filename, // 1secmail menggunakan nama file sebagai ID download
                filename: att.filename,
                size: att.size
            }))
        };
    },
    
    // 1secmail tidak mengizinkan hapus manual (otomatis terhapus). Kita pura-pura berhasil.
    async deleteMessage(token, id) {
        return new Response(null, { status: 204 });
    },
    
    async deleteAccount(token, accountId) {
        return new Response(null, { status: 204 });
    },
    
    // 1secmail tidak menyediakan unduhan .EML mentah secara langsung via API ini.
    async downloadEml(token, id) {
        throw new Error("Provider ini tidak mendukung format EML");
    },
    
    async downloadAttachment(token, msgId, attId) {
        const [login, domain] = token.split('@');
        // attId pada 1secmail adalah nama file itu sendiri (berdasarkan mapping di atas)
        return await fetch(`${BASE}/?action=download&login=${login}&domain=${domain}&id=${msgId}&file=${attId}`);
    }
};
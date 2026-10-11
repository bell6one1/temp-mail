// js/providers/tempmaillol.js
const BASE = 'https://api.tempmail.lol/v2';

export const tempmaillol = {
    name: 'TempMail.lol (Provider Ke-5)',
    
    async getDomains() {
        // TempMail.lol tidak memiliki endpoint list domain publik, mereka mengacaknya otomatis.
        // Kita kembalikan array kosong agar UI menggunakan domain acak bawaan mereka.
        return ['tempmail.lol']; 
    },
    
    async createAccount(email, password) {
        // Endpoint ini mengabaikan input email/password kita dan memberikan email acak berserta tokennya.
        const res = await fetch(`${BASE}/inbox/create`);
        if (!res.ok) throw new Error("Server TempMail.lol bermasalah");
        const data = await res.json();
        
        return { address: data.address, id: data.token, token: data.token };
    },
    
    async getToken(email, password) {
        // TempMail.lol menggunakan token statis yang didapat saat pembuatan.
        // Fitur "login" manual tidak didukung, jadi kita asumsikan password adalah tokennya jika user mencoba login.
        return { token: password, id: password };
    },
    
    async getMessages(token) {
        const res = await fetch(`${BASE}/inbox?token=${token}`);
        const data = await res.json();
        
        if (!data.emails) return [];

        return data.emails.map(msg => ({
            id: msg.id || Math.random().toString(36).substr(2, 9),
            from: { address: msg.from },
            subject: msg.subject,
            createdAt: msg.date,
            hasAttachments: false, // Tidak didukung via API publik
            rawEmail: msg // Menyimpan data asli untuk fungsi baca
        }));
    },
    
    async getMessage(token, id) {
        // TempMail.lol mengembalikan semua isi pesan saat memanggil getMessages.
        // Kita fetch ulang lalu cari ID yang sesuai.
        const res = await fetch(`${BASE}/inbox?token=${token}`);
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
        // Fitur hapus pesan spesifik tidak tersedia di API gratis mereka.
        return new Response(null, { status: 204 });
    },
    
    async downloadEml(token, id) {
        throw new Error("Format EML tidak didukung oleh penyedia ini.");
    },
    
    async deleteAccount(token, accountId) {
        // Akun otomatis dihapus oleh server setelah 1 jam.
        return new Response(null, { status: 204 });
    },
    
    async downloadAttachment(token, msgId, attId) {
        throw new Error("Unduhan lampiran tidak didukung oleh penyedia ini.");
    }
};
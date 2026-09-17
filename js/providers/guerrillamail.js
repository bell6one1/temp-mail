// js/providers/guerrillamail.js
const BASE = 'https://api.guerrillamail.com/ajax.php';

export const guerrillamail = {
    name: 'Guerrilla Mail (Penyelamat)',
    
    async getDomains() {
        // Guerrilla Mail menggunakan domain statis bawaan mereka.
        return ['sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamailbiz.com'];
    },
    
    async createAccount(email, password) {
        const [prefix, domain] = email.split('@');
        
        // 1. Meminta token sesi (sid_token) dari server
        let res = await fetch(`${BASE}?f=get_email_address`);
        if (!res.ok) throw new Error("Server Guerrilla bermasalah");
        let data = await res.json();
        let sid = data.sid_token;

        // 2. Mendaftarkan nama/prefix email kustom ke sesi tersebut
        res = await fetch(`${BASE}?f=set_email_user&email_user=${prefix}&lang=en&sid_token=${sid}`);
        data = await res.json();
        
        // Mengembalikan format data yang dikenali aplikasi kita
        return { address: `${data.email_addr}`, id: sid };
    },
    
    async getToken(email, password) {
        const [prefix, domain] = email.split('@');
        
        // Untuk "login", kita membuat sesi baru dan mengklaim nama email lama (Guerrilla mengizinkan hal ini)
        let res = await fetch(`${BASE}?f=get_email_address`);
        let data = await res.json();
        let sid = data.sid_token;

        await fetch(`${BASE}?f=set_email_user&email_user=${prefix}&lang=en&sid_token=${sid}`);
        
        return { token: sid, id: sid };
    },
    
    async getMessages(token) {
        const res = await fetch(`${BASE}?f=get_email_list&offset=0&sid_token=${token}`);
        const data = await res.json();
        
        if (!data.list) return [];
        
        // Menyembunyikan email sambutan otomatis (no-reply) agar kotak masuk terlihat bersih
        const realEmails = data.list.filter(msg => msg.mail_from !== 'no-reply@guerrillamail.com');

        return realEmails.map(msg => ({
            id: msg.mail_id.toString(),
            from: { address: msg.mail_from },
            subject: msg.mail_subject,
            createdAt: msg.mail_date, // Guerrilla mengembalikan timestamp
            hasAttachments: msg.att !== '0'
        }));
    },
    
    async getMessage(token, id) {
        const res = await fetch(`${BASE}?f=fetch_email&email_id=${id}&sid_token=${token}`);
        const data = await res.json();
        
        return {
            id: data.mail_id.toString(),
            from: { address: data.mail_from },
            subject: data.mail_subject,
            createdAt: data.mail_date,
            html: [data.mail_body], 
            text: data.mail_body,
            hasAttachments: false, // Lampiran Guerrilla kompleks via API terbuka, dimatikan sementara demi stabilitas
            attachments: [] 
        };
    },
    
    async deleteMessage(token, id) {
        return await fetch(`${BASE}?f=del_email&email_ids[]=${id}&sid_token=${token}`);
    },
    
    async downloadEml(token, id) {
        // Fallback error karena API terbuka mereka tidak mendukung raw .EML
        throw new Error("Provider ini tidak mendukung format EML");
    },
    
    async deleteAccount(token, accountId) {
        // Akun Guerrilla otomatis hancur dalam 1 jam. Kita pura-pura memberikan respon sukses.
        return new Response(null, { status: 204 });
    },
    
    async downloadAttachment(token, msgId, attId) {
        throw new Error("Provider ini tidak mengizinkan unduhan lampiran via API pihak ketiga.");
    }
};
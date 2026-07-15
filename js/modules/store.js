// js/modules/store.js

export const store = {
    API_BASE: 'https://api.mail.tm',
    currentEmail: '',
    currentPassword: '',
    currentToken: '',
    currentAccountId: '',
    countdownInterval: null,
    knownEmailIds: new Set(),
    isNotificationsEnabled: false
};
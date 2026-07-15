// js/modules/store.js

export const store = {
    currentProvider: 'mailtm', // Default menggunakan 'mailtm', cadangannya 'mailgw'
    currentEmail: '',
    currentPassword: '',
    currentToken: '',
    currentAccountId: '',
    countdownInterval: null,
    knownEmailIds: new Set(),
    isNotificationsEnabled: false
};
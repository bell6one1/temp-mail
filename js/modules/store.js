// js/modules/store.js

export const store = {
    currentProvider: 'guerrillamail', // Default menggunakan 'guerrillamail', cadangannya 'mailgw'
    currentEmail: '',
    currentPassword: '',
    currentToken: '',
    currentAccountId: '',
    countdownInterval: null,
    knownEmailIds: new Set(),
    isNotificationsEnabled: false
};

// settings.js - Settings functionality

function initializeSettingsModal() {
    const dialog = document.getElementById('settings-modal');
    const urlInput = document.getElementById('settings-url-input');
    const userInput = document.getElementById('settings-user-input');
    const passwordInput = document.getElementById('settings-password-input');

    document.getElementById('settings-btn').addEventListener('click', () => {
        urlInput.value = localStorage.getItem('baseUrl') || '';
        userInput.value = localStorage.getItem('user') || '';
        passwordInput.value = localStorage.getItem('password') || '';
        dialog.showModal();
    });

    document.getElementById('settings-close-btn').addEventListener('click', () => dialog.close());
    document.getElementById('settings-save-btn').addEventListener('click', () => {
        localStorage.setItem('baseUrl', urlInput.value);
        localStorage.setItem('user', userInput.value);
        localStorage.setItem('password', passwordInput.value);
        dialog.close();
        initializeApp(); // Re-initialize after saving
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}

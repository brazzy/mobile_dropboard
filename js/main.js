// main.js - Main entry point for the application

document.addEventListener('DOMContentLoaded', () => {
    const boardName = 'Tasks Privat';
    // Initialize application components in the correct order
    initializeApp(boardName);
    initializeSettingsModal(boardName);
    initializeEditModal();
    initializeDragAndDrop();
});

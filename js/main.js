// main.js - Main entry point for the application

document.addEventListener('DOMContentLoaded', () => {
    // Initialize application components in the correct order
    const boardName = initializeBoardSelector();
    initializeApp(boardName);
    initializeSettingsModal(boardName);
    initializeEditModal();
    initializeDragAndDrop();
});

// editTask.js - Edit task functionality

function initializeEditModal() {
    const dialog = document.getElementById('edit-modal');
    const titleInput = document.getElementById('modal-title-input');
    const contentDisplay = document.getElementById('modal-content-display');
    const contentTextarea = document.getElementById('modal-content-textarea');
    const actionsView = document.getElementById('modal-actions-view');
    const actionsEdit = document.getElementById('modal-actions-edit');
    let currentEditingItem = null;

    function setEditModalState(mode) {
        const isEdit = mode === 'edit';
        titleInput.readOnly = !isEdit;

        // Toggle visibility of display div vs textarea
        contentDisplay.classList.toggle('modal-content-hidden', isEdit);
        contentTextarea.classList.toggle('modal-content-hidden', !isEdit);

        actionsView.classList.toggle('modal-actions-hidden', isEdit);
        actionsEdit.classList.toggle('modal-actions-hidden', !isEdit);
        if (isEdit) contentTextarea.focus();
    }

    async function openAndFetchContent(item) {
        currentEditingItem = item;
        titleInput.value = item.dataset.title || '';

        setEditModalState('view');
        dialog.showModal();

        // Show loading state
        contentDisplay.innerHTML = '<p>Loading content...</p>';
        contentTextarea.value = 'Loading content...';

        // Use the fetchTaskContent function from api.js
        const realTitle = item.dataset.realTitle;
        const result = await fetchTaskContent(realTitle);
        
        if (result.success) {
            // Populate both the display div and the textarea
            contentDisplay.innerHTML = formatContentToHtml(result.content);
            contentTextarea.value = result.content;
            item.dataset.content = result.content;
        } else {
            const errorMsg = `Failed to load content. Error: ${result.error}`;
            contentDisplay.innerHTML = `<p>${errorMsg}</p>`;
            contentTextarea.value = errorMsg;
        }
    }

    document.getElementById('board').addEventListener('dblclick', (e) => {
        const item = e.target.closest('.sortable-item');
        if (item) openAndFetchContent(item);
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.getElementById('modal-edit-btn').addEventListener('click', () => setEditModalState('edit'));
    document.getElementById('modal-close-btn').addEventListener('click', () => dialog.close());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        // When cancelling, revert to view mode without saving
        setEditModalState('view');
        dialog.close();
    });
    document.getElementById('modal-save-btn').addEventListener('click', () => {
        if (currentEditingItem) {
            const title = titleInput.value.trim();
            const content = contentTextarea.value; // No trim on content
            currentEditingItem.dataset.title = title;
            currentEditingItem.dataset.content = content;
            currentEditingItem.textContent = title;

            // Update the display div with the new formatted content before closing
            contentDisplay.innerHTML = formatContentToHtml(content);
            dialog.close();
        }
    });
}

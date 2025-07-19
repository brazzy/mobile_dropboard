// editTask.js - Edit task functionality

// Global state for the edit modal
const editModalState = {
    currentEditingItem: null,
    targetListId: null,
    isNewTask: false,
    originalTitle: null // Store the original title to detect changes
};

/**
 * Sets the edit modal state to either view or edit mode
 * @param {string} mode - Either 'view' or 'edit'
 */
function setEditModalState(mode) {
    const titleInput = document.getElementById('modal-title-input');
    const contentDisplay = document.getElementById('modal-content-display');
    const contentTextarea = document.getElementById('modal-content-textarea');
    const actionsView = document.getElementById('modal-actions-view');
    const actionsEdit = document.getElementById('modal-actions-edit');
    
    const isEdit = mode === 'edit';
    titleInput.readOnly = !isEdit;

    // Toggle visibility of display div vs textarea
    contentDisplay.classList.toggle('modal-content-hidden', isEdit);
    contentTextarea.classList.toggle('modal-content-hidden', !isEdit);

    actionsView.classList.toggle('modal-actions-hidden', isEdit);
    actionsEdit.classList.toggle('modal-actions-hidden', !isEdit);
    if (isEdit) contentTextarea.focus();
}

/**
 * Opens the task edit dialog for creating a new task
 * @param {string} listId - The ID of the list where the new task will be added
 */
function openNewTaskDialog(listId) {
    // Store the target list ID and mark as a new task
    editModalState.targetListId = listId;
    editModalState.currentEditingItem = null;
    editModalState.isNewTask = true;
    
    const dialog = document.getElementById('edit-modal');
    const titleInput = document.getElementById('modal-title-input');
    const contentTextarea = document.getElementById('modal-content-textarea');
    const contentDisplay = document.getElementById('modal-content-display');
    const modalError = document.getElementById('modal-error');
    
    // Clear any previous values and hide error message
    titleInput.value = '';
    contentTextarea.value = '';
    contentDisplay.innerHTML = '';
    modalError.style.display = 'none';
    
    // Open in edit mode immediately
    setEditModalState('edit');
    dialog.showModal();
    
    // Focus on the title input after a short delay to ensure the modal is visible
    setTimeout(() => {
        titleInput.focus();
    }, 100);
}

/**
 * Adds a new task to the data structure
 * @param {string} realTitle - The unique identifier for the task
 * @param {string} displayTitle - The display title for the task
 * @param {string} content - The content of the task
 */
function addNewTaskToDataStructure(realTitle, displayTitle, content) {
    // Check if columnNavigator exists and is properly initialized
    if (typeof columnNavigator === 'undefined' || !columnNavigator.columns || !columnNavigator.columns.length) {
        console.error('Column navigator not available for adding new task');
        return;
    }
    
    // Get the current column index
    const currentColumnIndex = columnNavigator.currentColumnIndex;
    if (currentColumnIndex < 0 || currentColumnIndex >= columnNavigator.columns.length) {
        console.error('Invalid column index');
        return;
    }
    
    // Get the current column
    const currentColumn = columnNavigator.columns[currentColumnIndex];
    
    // Create a new task object
    const newTask = {
        realTitle: realTitle,
        displayTitle: displayTitle,
        content: content
    };
    
    // Add the new task to the beginning of the items array
    currentColumn.items.unshift(newTask);
    
    console.log('New task added to data structure:', displayTitle);
}

/**
 * Updates the title of a task in the data structure
 * @param {HTMLElement} taskElement - The task element being edited
 * @param {string} newTitle - The new title for the task
 */
function updateTaskTitleInDataStructure(taskElement, newTitle) {
    // Check if columnNavigator exists and is properly initialized
    if (typeof columnNavigator === 'undefined' || !columnNavigator.columns || !columnNavigator.columns.length) {
        console.error('Column navigator not available for updating task title');
        return;
    }
    
    // Get the current column index
    const currentColumnIndex = columnNavigator.currentColumnIndex;
    if (currentColumnIndex < 0 || currentColumnIndex >= columnNavigator.columns.length) {
        console.error('Invalid column index');
        return;
    }
    
    // Get the current column
    const currentColumn = columnNavigator.columns[currentColumnIndex];
    
    // Find the task in the column's items array
    const realTitle = taskElement.dataset.realTitle;
    const taskIndex = currentColumn.items.findIndex(item => item.realTitle === realTitle);
    
    if (taskIndex !== -1) {
        // Update the title in the data structure
        currentColumn.items[taskIndex].displayTitle = newTitle;
        console.log('Task title updated in data structure:', newTitle);
    } else {
        console.error('Task not found in data structure');
    }
}

function initializeEditModal() {
    const dialog = document.getElementById('edit-modal');
    const titleInput = document.getElementById('modal-title-input');
    const contentDisplay = document.getElementById('modal-content-display');
    const contentTextarea = document.getElementById('modal-content-textarea');
    const actionsView = document.getElementById('modal-actions-view');
    const actionsEdit = document.getElementById('modal-actions-edit');

    async function openAndFetchContent(item) {
        editModalState.currentEditingItem = item;
        editModalState.isNewTask = false;
        titleInput.value = item.dataset.title || '';
        editModalState.originalTitle = item.dataset.title || '';
        
        // Hide error message when opening an existing task
        const modalError = document.getElementById('modal-error');
        modalError.style.display = 'none';

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

    document.getElementById('board-container').addEventListener('dblclick', (e) => {
        const item = e.target.closest('.sortable-item');
        if (item) openAndFetchContent(item);
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.getElementById('modal-edit-btn').addEventListener('click', () => setEditModalState('edit'));
    
    // Add event listener to save title changes as they happen
    titleInput.addEventListener('input', () => {
        if (editModalState.currentEditingItem && !editModalState.isNewTask) {
            const newTitle = titleInput.value.trim();
            
            // Update the item's dataset
            editModalState.currentEditingItem.dataset.title = newTitle;
            
            // Update the displayed title in the content wrapper
            const contentWrapper = editModalState.currentEditingItem.querySelector('.content-wrapper');
            if (contentWrapper) {
                contentWrapper.textContent = newTitle;
            }
            
            // Update the title in the board data structure
            updateTaskTitleInDataStructure(editModalState.currentEditingItem, newTitle);
        }
    });
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        dialog.close();
        // Reset state after closing
        editModalState.currentEditingItem = null;
        editModalState.targetListId = null;
        editModalState.isNewTask = false;
    });
    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        // When cancelling, revert to view mode without saving
        setEditModalState('view');
        dialog.close();
        
        // Reset state after cancelling
        if (editModalState.isNewTask) {
            editModalState.targetListId = null;
            editModalState.isNewTask = false;
        }
        editModalState.currentEditingItem = null;
    });
    document.getElementById('modal-save-btn').addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentTextarea.value; // No trim on content
        const modalError = document.getElementById('modal-error');
        
        // Validate that title is not empty
        if (!title) {
            modalError.style.display = 'block';
            titleInput.focus();
            return; // Stop execution and don't save
        }
        
        // Hide error message if it was previously shown
        modalError.style.display = 'none';
        
        if (editModalState.currentEditingItem) {
            // Editing an existing task
            editModalState.currentEditingItem.dataset.title = title;
            editModalState.currentEditingItem.dataset.content = content;
            
            // Ensure proper structure is maintained for styling
            // Clear existing content first
            editModalState.currentEditingItem.innerHTML = '';
            
            // Create proper structure with content-wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'content-wrapper';
            contentWrapper.textContent = title;
            
            // Add drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            
            // Add elements to the item
            editModalState.currentEditingItem.appendChild(dragHandle);
            editModalState.currentEditingItem.appendChild(contentWrapper);

            // Update the display div with the new formatted content before closing
            contentDisplay.innerHTML = formatContentToHtml(content);
        } else if (editModalState.isNewTask && editModalState.targetListId) {
            // Creating a new task
            const targetList = document.getElementById(editModalState.targetListId);
            if (targetList) {
                // Create a new item element directly here
                const item = document.createElement('li');
                item.className = 'sortable-item';
                item.dataset.id = `item-${Date.now()}-${Math.random()}`;
                item.dataset.title = title;
                item.dataset.content = content;
                item.dataset.realTitle = `New-${Date.now()}`; // Add a realTitle for consistency
                
                // Create proper structure with content-wrapper
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'content-wrapper';
                contentWrapper.textContent = title;
                
                // Add drag handle
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                
                // Add elements to the item
                item.appendChild(dragHandle);
                item.appendChild(contentWrapper);
                
                targetList.prepend(item);
                
                // The item will be made draggable by the interact.js library
                // since it has the 'sortable-item' class
                
                // Add the new task to the data structure
                addNewTaskToDataStructure(item.dataset.realTitle, title, content);
            }
        }
        
        dialog.close();
        // Reset state after closing
        editModalState.currentEditingItem = null;
        editModalState.targetListId = null;
        editModalState.isNewTask = false;
    });
}

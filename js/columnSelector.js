// columnSelector.js - Column selector functionality for drag and drop between columns

// Global variables
let columnSelectorBtn;
let columnDropdown;
let isDragging = false;
let draggedTask = null;

/**
 * Initialize the column selector functionality
 */
function initializeColumnSelector() {
    console.log('Initializing column selector');
    
    // Get the column selector button
    columnSelectorBtn = document.getElementById('column-selector-btn');
    if (!columnSelectorBtn) {
        console.error('Column selector button not found');
        return;
    }
    
    // Create the dropdown element
    columnDropdown = document.createElement('div');
    columnDropdown.className = 'column-selector-dropdown';
    columnDropdown.id = 'column-selector-dropdown';
    document.body.appendChild(columnDropdown);
    
    // Add event listeners for drag operations
    setupDragListeners();
    
    // Add click handler for the button
    columnSelectorBtn.addEventListener('click', function() {
        if (isDragging) {
            toggleDropdown(true);
        }
    });
    
    console.log('Column selector initialized');
}

/**
 * Set up event listeners for drag operations
 */
function setupDragListeners() {
    // Listen for custom drag events from dragdrop.js
    
    // Handle drag start
    document.addEventListener('taskDragStart', function(e) {
        console.log('Column selector: Task drag started', e.detail.item.dataset.title);
        isDragging = true;
        draggedTask = e.detail.item;
    });
    
    // Handle drag move
    document.addEventListener('taskDragMove', function(e) {
        if (isDragging) {
            handleDragMove(e.detail.clientX, e.detail.clientY);
        }
    });
    
    // Handle drag end
    document.addEventListener('taskDragEnd', function() {
        console.log('Column selector: Drag ended');
        isDragging = false;
        draggedTask = null;
        columnSelectorBtn.classList.remove('highlight');
        toggleDropdown(false);
    });
}

/**
 * Handle mouse movement during drag
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
function handleDragMove(clientX, clientY) {
    if (!isDragging || !draggedTask) return;
    
    // Check if mouse is over the column selector button
    const btnRect = columnSelectorBtn.getBoundingClientRect();
    const isOverButton = 
        clientX >= btnRect.left &&
        clientX <= btnRect.right &&
        clientY >= btnRect.top &&
        clientY <= btnRect.bottom;
    
    if (isOverButton) {
        console.log('Dragging over column selector button');
        columnSelectorBtn.classList.add('highlight');
        toggleDropdown(true);
    } else if (columnDropdown.classList.contains('active')) {
        // Check if mouse is over the dropdown
        const dropdownRect = columnDropdown.getBoundingClientRect();
        const isOverDropdown = 
            clientX >= dropdownRect.left &&
            clientX <= dropdownRect.right &&
            clientY >= dropdownRect.top &&
            clientY <= dropdownRect.bottom;
        
        if (!isOverDropdown) {
            columnSelectorBtn.classList.remove('highlight');
            toggleDropdown(false);
        } else {
            // Check if mouse is over a specific column item
            const items = columnDropdown.querySelectorAll('.column-selector-item');
            items.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                const isOverItem = 
                    clientX >= itemRect.left &&
                    clientX <= itemRect.right &&
                    clientY >= itemRect.top &&
                    clientY <= itemRect.bottom;
                
                if (isOverItem) {
                    item.classList.add('drop-target');
                    
                    // Handle drop on mouseup
                    item.onmouseup = function() {
                        if (isDragging && draggedTask) {
                            const boardIndex = parseInt(item.dataset.boardIndex);
                            if (!isNaN(boardIndex)) {
                                console.log('Dropping task on column:', boardIndex);
                                moveTaskToBoard(draggedTask, boardIndex);
                                toggleDropdown(false);
                                isDragging = false;
                                draggedTask = null;
                            }
                        }
                    };
                    
                    // Handle drop event (when user releases mouse button anywhere)
                    item.ondrop = function(e) {
                        e.preventDefault();
                        if (isDragging && draggedTask) {
                            const boardIndex = parseInt(item.dataset.boardIndex);
                            if (!isNaN(boardIndex)) {
                                console.log('Task dropped on column title:', boardIndex);
                                moveTaskToBoard(draggedTask, boardIndex);
                                toggleDropdown(false);
                                isDragging = false;
                                draggedTask = null;
                            }
                        }
                    };
                    
                    // Allow drop
                    item.ondragover = function(e) {
                        e.preventDefault();
                    };
                } else {
                    item.classList.remove('drop-target');
                    item.onmouseup = null;
                    item.ondrop = null;
                    item.ondragover = null;
                }
            });
        }
    } else {
        columnSelectorBtn.classList.remove('highlight');
    }
}

/**
 * Toggle the dropdown visibility
 * @param {boolean} show - Whether to show or hide the dropdown
 */
function toggleDropdown(show) {
    if (show) {
        showDropdown();
    } else {
        hideDropdown();
    }
}

/**
 * Show the dropdown with column options
 */
function showDropdown() {
    console.log('Showing dropdown');
    
    // Get the board navigator from the global scope
    // This is defined in swipe.js
    if (typeof boardNavigator === 'undefined') {
        console.error('Board navigator is not defined');
        return;
    }
    
    console.log('Board navigator:', boardNavigator);
    
    if (!boardNavigator || !boardNavigator.boards || !boardNavigator.boards.length) {
        console.error('Board navigator has no boards');
        return;
    }
    
    // Clear existing items
    columnDropdown.innerHTML = '';
    
    // Get current board index
    const currentIndex = boardNavigator.currentBoardIndex;
    console.log('Current board index:', currentIndex);
    
    // Add all boards except the current one
    let hasOtherBoards = false;
    boardNavigator.boards.forEach((board, index) => {
        if (index === currentIndex) return; // Skip current board
        
        hasOtherBoards = true;
        const item = document.createElement('div');
        item.className = 'column-selector-item';
        item.textContent = board.header;
        item.dataset.boardIndex = index;
        
        // Make the item a proper drop target
        item.setAttribute('draggable', 'false');
        item.setAttribute('data-droppable', 'true');
        
        columnDropdown.appendChild(item);
        console.log('Added board to dropdown:', board.header, 'index:', index);
    });
    
    if (!hasOtherBoards) {
        console.log('No other boards available');
        return;
    }
    
    // Position the dropdown below the button
    const btnRect = columnSelectorBtn.getBoundingClientRect();
    columnDropdown.style.position = 'absolute';
    columnDropdown.style.top = (btnRect.bottom + window.scrollY) + 'px';
    columnDropdown.style.left = (btnRect.left + window.scrollX) + 'px';
    columnDropdown.style.width = btnRect.width + 'px';
    
    // Show the dropdown
    columnDropdown.classList.add('active');
    console.log('Dropdown shown');
}

/**
 * Hide the dropdown
 */
function hideDropdown() {
    console.log('Hiding dropdown');
    columnDropdown.classList.remove('active');
    
    // Remove any event handlers from items
    const items = columnDropdown.querySelectorAll('.column-selector-item');
    items.forEach(item => {
        item.onmouseup = null;
        item.ondrop = null;
        item.ondragover = null;
        item.classList.remove('drop-target');
    });
}

/**
 * Move a task to another board
 * @param {HTMLElement} task - The task element to move
 * @param {number} targetBoardIndex - The index of the target board
 */
function moveTaskToBoard(task, targetBoardIndex) {
    console.log('Moving task to board', targetBoardIndex);
    if (typeof boardNavigator === 'undefined') {
        console.error('Board navigator is not defined');
        return;
    }
    
    if (!boardNavigator || !boardNavigator.boards) {
        console.error('Board navigator has no boards');
        return;
    }
    
    // Get task data
    const taskTitle = task.dataset.title;
    const taskRealTitle = task.dataset.realTitle;
    const taskContent = task.dataset.content;
    
    console.log('Task data:', { title: taskTitle, realTitle: taskRealTitle });
    
    // Get the current board index
    const currentBoardIndex = boardNavigator.currentBoardIndex;
    
    // Remove task from current board's data structure
    if (currentBoardIndex >= 0 && currentBoardIndex < boardNavigator.boards.length) {
        const currentBoard = boardNavigator.boards[currentBoardIndex];
        // Filter out the task being moved from the current board's items
        currentBoard.items = currentBoard.items.filter(item => item.realTitle !== taskRealTitle);
    }
    
    // Remove task from DOM
    task.remove();
    
    // Get target board
    const targetBoard = boardNavigator.boards[targetBoardIndex];
    if (!targetBoard) {
        console.error('Target board not found');
        return;
    }
    
    // Add task to the beginning of target board's items array (at the top)
    targetBoard.items.unshift({
        realTitle: taskRealTitle || `item-${Date.now()}`,
        displayTitle: taskTitle || 'Moved Task',
        content: taskContent || ''
    });
    
    console.log('Task added to the top of board', targetBoard.header);
    
    // Update the current board's task order in the data structure
    // This ensures we capture any drag-and-drop reordering that happened before the move
    if (currentBoardIndex >= 0 && currentBoardIndex < boardNavigator.boards.length) {
        // Only update if we're still on the source board
        if (boardNavigator.currentBoardIndex === currentBoardIndex) {
            updateTaskOrderInDataStructure();
        }
    }
    
    // If the target board is currently displayed, refresh it
    if (boardNavigator.currentBoardIndex === targetBoardIndex) {
        boardNavigator.showCurrentBoard();
    }
}

// Initialize the column selector when the page is loaded
// We need to hook into the existing application flow

// This function will be called after the board data is loaded
function initColumnSelector() {
    // Wait a short time to ensure the board navigator is fully initialized
    setTimeout(function() {
        console.log('Initializing column selector');
        initializeColumnSelector();
    }, 500);
}

// Hook into the existing initialization flow
// The original initializeSwipeNavigation function is in swipe.js
const originalInitSwipeNav = window.initializeSwipeNavigation;
window.initializeSwipeNavigation = function() {
    // Call the original function first
    if (originalInitSwipeNav) {
        originalInitSwipeNav.apply(this, arguments);
    }
    
    console.log('Swipe navigation initialized, setting up column selector');
    
    // The original setNavigationBoards function is called after boards are loaded
    const originalSetNavBoards = window.setNavigationBoards;
    window.setNavigationBoards = function(boardData) {
        // Call the original function first
        if (originalSetNavBoards) {
            originalSetNavBoards.apply(this, arguments);
        }
        
        console.log('Boards loaded, initializing column selector');
        initColumnSelector();
    };
};

// Also set up a backup initialization method
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up column selector initialization');
    
    // Set a timeout to check if the column selector has been initialized
    setTimeout(function() {
        if (!document.getElementById('column-selector-dropdown')) {
            console.log('Column selector not initialized yet, trying direct initialization');
            initializeColumnSelector();
        }
    }, 2000);
});

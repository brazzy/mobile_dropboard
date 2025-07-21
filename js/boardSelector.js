// boardSelector.js - Board selector functionality for switching between boards

// Global variables
let boardSelectorBtn;
let boardDropdown;
let currentBoardName = '';

// Hardcoded list of available boards
const availableBoards = [
    'Tasks Privat',
    'Tasks Lexcom',
    'Tasks Kalender'
];

/**
 * Initialize the board selector functionality
 */
function initializeBoardSelector() {
    // Choose the initial board name
    currentBoardName = availableBoards[0];

    console.log('Initializing board selector for: ' + currentBoardName);    
    
    // Get the board selector button
    boardSelectorBtn = document.getElementById('board-selector-btn');
    if (!boardSelectorBtn) {
        console.error('Board selector button not found');
        return;
    }
    
    // Update the button text to show current board name
    updateBoardSelectorButton();
    
    // Create the dropdown element
    boardDropdown = document.createElement('div');
    boardDropdown.className = 'board-selector-dropdown';
    boardDropdown.id = 'board-selector-dropdown';
    document.body.appendChild(boardDropdown);
    
    // Add click handler for the button
    boardSelectorBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        toggleDropdown();
    });
    
    // Close dropdown when clicking elsewhere
    document.addEventListener('click', function(event) {
        if (boardDropdown && boardDropdown.classList.contains('active') && 
            event.target !== boardSelectorBtn && !boardDropdown.contains(event.target)) {
            hideDropdown();
        }
    });
    
    console.log('Board selector initialized');
    return currentBoardName;
}

/**
 * Update the board selector button to show current board name
 */
function updateBoardSelectorButton() {
    if (boardSelectorBtn) {
        boardSelectorBtn.innerHTML = `📁 ${currentBoardName}`;
        boardSelectorBtn.title = `Current board: ${currentBoardName}`;
    }
}

/**
 * Toggle the dropdown visibility
 */
function toggleDropdown() {
    if (boardDropdown.classList.contains('active')) {
        hideDropdown();
    } else {
        showDropdown();
    }
}

/**
 * Show the dropdown with board options
 */
function showDropdown() {
    console.log('Showing board dropdown');
    
    // Clear existing items
    boardDropdown.innerHTML = '';
    
    // Add all boards
    availableBoards.forEach(boardName => {
        const item = document.createElement('div');
        item.className = 'board-selector-item';
        
        // Highlight current board
        if (boardName === currentBoardName) {
            item.classList.add('current');
        }
        
        item.textContent = boardName;
        item.dataset.boardName = boardName;
        
        // Add click handler for board selection
        item.addEventListener('click', function() {
            if (boardName !== currentBoardName) {
                switchBoard(boardName);
            }
            hideDropdown();
        });
        
        boardDropdown.appendChild(item);
        console.log('Added board to dropdown:', boardName);
    });
    
    // Position the dropdown below the button
    const btnRect = boardSelectorBtn.getBoundingClientRect();
    boardDropdown.style.position = 'absolute';
    boardDropdown.style.top = (btnRect.bottom + window.scrollY) + 'px';
    boardDropdown.style.left = (btnRect.left + window.scrollX) + 'px';
    
    // Show the dropdown
    boardDropdown.classList.add('active');
    console.log('Board dropdown shown');
}

/**
 * Hide the dropdown
 */
function hideDropdown() {
    console.log('Hiding board dropdown');
    if (boardDropdown) {
        boardDropdown.classList.remove('active');
    }
}

/**
 * Switch to a different board
 * @param {string} boardName - The name of the board to switch to
 */
function switchBoard(boardName) {
    console.log('Switching to board:', boardName);
    
    // Update current board name
    currentBoardName = boardName;
    
    // Update the button text
    updateBoardSelectorButton();
    
    // Show loading message
    const currentColumn = document.getElementById('current-column');
    currentColumn.innerHTML = `<p id="column-message">Loading board: ${boardName}...</p>`;
    
    // Reinitialize the app with the new board
    initializeApp(boardName);
}

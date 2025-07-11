// swipe.js - Swipe navigation for mobile view

/**
 * Manages the board navigation with swipe gestures
 */
class BoardNavigator {
    constructor() {
        this.boards = [];
        this.currentBoardIndex = 0;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50; // Minimum distance to trigger swipe
        this.boardContainer = document.getElementById('board-container');
        this.currentBoard = document.getElementById('current-board');
        this.boardTitle = document.getElementById('board-title');
        this.boardIndicator = document.getElementById('board-indicator');
        
        // Initialize swipe detection
        this.initSwipeDetection();
    }

    /**
     * Sets up the boards for navigation
     * @param {Array} boardData - Array of board data objects
     */
    setBoards(boardData) {
        this.boards = boardData;
        this.currentBoardIndex = 0;
        this.updateBoardIndicator();
        this.showCurrentBoard();
    }

    /**
     * Initialize swipe detection on the board container
     */
    initSwipeDetection() {
        // Touch events for mobile
        this.boardContainer.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.boardContainer.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        // Add navigation buttons event listeners
        document.getElementById('prev-board').addEventListener('click', () => this.prevBoard());
        document.getElementById('next-board').addEventListener('click', () => this.nextBoard());
    }

    /**
     * Handle the swipe gesture
     */
    handleSwipe() {
        const swipeDistance = this.touchEndX - this.touchStartX;
        
        if (Math.abs(swipeDistance) < this.minSwipeDistance) return;
        
        if (swipeDistance > 0) {
            // Swipe right - go to previous board
            this.prevBoard();
        } else {
            // Swipe left - go to next board
            this.nextBoard();
        }
    }

    /**
     * Navigate to the previous board
     */
    prevBoard() {
        if (this.currentBoardIndex > 0) {
            this.currentBoardIndex--;
            this.showCurrentBoard();
            this.updateBoardIndicator();
        }
    }

    /**
     * Navigate to the next board
     */
    nextBoard() {
        if (this.currentBoardIndex < this.boards.length - 1) {
            this.currentBoardIndex++;
            this.showCurrentBoard();
            this.updateBoardIndicator();
        }
    }

    /**
     * Show the current board
     */
    showCurrentBoard() {
        if (!this.boards.length) return;
        
        const currentBoard = this.boards[this.currentBoardIndex];
        this.boardTitle.textContent = currentBoard.header;
        
        // Clear current board
        this.currentBoard.innerHTML = '';
        
        // Create the list for the current board
        const listId = `list-${currentBoard.header.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        const itemsHTML = currentBoard.items.map(item => `
            <li class="sortable-item" 
                data-id="item-${Date.now()}-${Math.random()}" 
                data-real-title="${escapeHtml(item.realTitle)}"
                data-title="${escapeHtml(item.displayTitle)}" 
                data-content="${escapeHtml(item.content)}">
                ${escapeHtml(item.displayTitle)}
            </li>
        `).join('');

        const columnHTML = `
            <div class="list-column">
                <div class="list-header">
                    <h2>${currentBoard.header}</h2>
                    <button class="add-item-btn" data-target-list="${listId}">+</button>
                </div>
                <ul id="${listId}" class="sortable-list">${itemsHTML}</ul>
            </div>
        `;
        
        this.currentBoard.innerHTML = columnHTML;
        
        // Reinitialize drag and drop for the new items
        initializeDragAndDrop();
    }

    /**
     * Update the board indicator dots
     */
    updateBoardIndicator() {
        if (!this.boards.length) return;
        
        this.boardIndicator.innerHTML = '';
        
        for (let i = 0; i < this.boards.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'indicator-dot';
            if (i === this.currentBoardIndex) {
                dot.classList.add('active');
            }
            this.boardIndicator.appendChild(dot);
        }
    }
}

// Global instance of the board navigator
let boardNavigator;

/**
 * Initialize the board navigator
 */
function initializeSwipeNavigation() {
    boardNavigator = new BoardNavigator();
}

/**
 * Set the boards data for navigation
 * @param {Array} boardData - Array of board data objects
 */
function setNavigationBoards(boardData) {
    if (boardNavigator) {
        boardNavigator.setBoards(boardData);
    }
}

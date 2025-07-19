// swipe.js - Swipe navigation for mobile view

/**
 * Manages the column navigation with swipe gestures
 */
class ColumnNavigator {
    constructor() {
        this.columns = [];
        this.currentColumnIndex = 0;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50; // Minimum distance to trigger swipe
        this.boardContainer = document.getElementById('board-container');
        this.currentColumn = document.getElementById('current-column');
        this.columnIndicator = document.getElementById('column-indicator');
        
        // Initialize swipe detection
        this.initSwipeDetection();
    }

    /**
     * Sets up the columns for navigation
     * @param {Array} columnData - Array of column data objects
     */
    setColumns(columnData) {
        this.columns = columnData;
        this.currentColumnIndex = 0;
        this.updateColumnIndicator();
        this.showCurrentColumn();
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
        document.getElementById('prev-column').addEventListener('click', () => this.prevColumn());
        document.getElementById('next-column').addEventListener('click', () => this.nextColumn());
    }

    /**
     * Handle the swipe gesture
     */
    handleSwipe() {
        const swipeDistance = this.touchEndX - this.touchStartX;
        
        if (Math.abs(swipeDistance) < this.minSwipeDistance) return;
        
        if (swipeDistance > 0) {
            // Swipe right - go to previous column
            this.prevColumn();
        } else {
            // Swipe left - go to next column
            this.nextColumn();
        }
    }

    /**
     * Navigate to the previous column
     */
    prevColumn() {
        if (this.currentColumnIndex > 0) {
            this.currentColumnIndex--;
            this.showCurrentColumn();
            this.updateColumnIndicator();
        }
    }

    /**
     * Navigate to the next column
     */
    nextColumn() {
        if (this.currentColumnIndex < this.columns.length - 1) {
            this.currentColumnIndex++;
            this.showCurrentColumn();
            this.updateColumnIndicator();
        }
    }

    /**
     * Show the current column
     */
    showCurrentColumn() {
        if (!this.columns.length) return;
        
        const currentColumn = this.columns[this.currentColumnIndex];
        
        // Update document title for better mobile experience
        document.title = `${currentColumn.header} - Mobile Dropboard`;
        
        // Clear current column
        this.currentColumn.innerHTML = '';
        
        // Create the list for the current column
        const listId = `list-${currentColumn.header.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        const itemsHTML = currentColumn.items.map(item => `
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
                    <h2>${currentColumn.header}</h2>
                    <button class="add-item-btn" data-target-list="${listId}">+</button>
                </div>
                <ul id="${listId}" class="sortable-list">${itemsHTML}</ul>
            </div>
        `;
        
        this.currentColumn.innerHTML = columnHTML;
        
        // Reinitialize drag and drop for the new items
        initializeDragAndDrop();
    }

    /**
     * Update the column indicator dots
     */
    updateColumnIndicator() {
        if (!this.columns.length) return;
        
        this.columnIndicator.innerHTML = '';
        
        for (let i = 0; i < this.columns.length; i++) {
            const dot = document.createElement('span');
            dot.className = 'indicator-dot';
            if (i === this.currentColumnIndex) {
                dot.classList.add('active');
            }
            this.columnIndicator.appendChild(dot);
        }
    }
}

// Global instance of the column navigator
let columnNavigator;

/**
 * Initialize the column navigator
 */
function initializeSwipeNavigation() {
    columnNavigator = new ColumnNavigator();
}

/**
 * Set the columns data for navigation
 * @param {Array} columnData - Array of column data objects
 */
function setNavigationColumns(columnData) {
    if (columnNavigator) {
        columnNavigator.setColumns(columnData);
    }
}

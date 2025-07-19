// init.js - Setup and initialization

/**
 * Initializes the application by fetching column data and rendering it
 */
async function initializeApp(boardName) {
    const currentColumn = document.getElementById('current-column');
    currentColumn.innerHTML = `<p id="column-message">Loading...</p>`;
    
    try {
        // Show loading message
        document.getElementById('column-message').textContent = 'Fetching board data...';
        
        // Fetch board data from API
        const result = await fetchBoardData(boardName);
        
        if (!result.success) {
            document.getElementById('column-message').innerHTML = `Error: ${result.error}`;
            return;
        }
        
        // Initialize swipe navigation
        initializeSwipeNavigation();
        
        // Set the columns data for navigation
        setNavigationColumns(result.data);
        
    } catch (error) {
        document.getElementById('column-message').textContent = `Failed to initialize columns: ${error.message}`;
        console.error('Initialization Error:', error);
    }
}

// The renderColumn function is now handled by the ColumnNavigator class in swipe.js

// Helper functions
function parseListString(listString) {
    if (!listString || typeof listString !== 'string') return [];
    const regex = /\[\[.*?\]\]|\S+/g;
    const matches = listString.match(regex);
    if (!matches) return [];
    return matches.map(item => item.startsWith('[[') ? item.slice(2, -2) : item);
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formats raw text into simple HTML based on markdown-like rules.
 * @param {string} text The raw text content.
 * @returns {string} The formatted HTML string.
 */
function formatContentToHtml(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let listLevel = 0;

    const closeLists = (level) => {
        let closingHtml = '';
        while (listLevel > level) {
            closingHtml += '</ul>';
            listLevel--;
        }
        return closingHtml;
    };

    lines.forEach(line => {
        // Headers: !, !!, !!!
        const headerMatch = line.match(/^(!+)\s*(.*)/);
        if (headerMatch) {
            html += closeLists(0);
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            html += `<h${level}>${escapeHtml(content)}</h${level}>`;
            return;
        }

        // Lists: *, **, ***
        const listMatch = line.match(/^(\*+)\s*(.*)/);
        if (listMatch) {
            const newLevel = listMatch[1].length;
            const content = listMatch[2];
            if (newLevel > listLevel) {
                for (let i = listLevel; i < newLevel; i++) html += '<ul>';
            } else if (newLevel < listLevel) {
                html += closeLists(newLevel);
            }
            listLevel = newLevel;
            html += `<li>${escapeHtml(content)}</li>`;
            return;
        }

        // Paragraphs
        html += closeLists(0);
        if (line.trim() !== '') {
            html += `<p>${escapeHtml(line)}</p>`;
        }
    });

    html += closeLists(0); // Close any remaining lists at the end
    return html;
}

// Add Item Logic
/**
 * Creates a new task item element
 * @param {string} title - The title of the task (defaults to 'New Task')
 * @param {string} content - The content of the task (defaults to 'Click to add details.')
 * @returns {HTMLElement} - The created task item element
 */
function createNewItemElement(title = 'New Task', content = 'Click to add details.') {
    const item = document.createElement('li');
    item.className = 'sortable-item';
    item.dataset.id = `item-${Date.now()}`;
    item.dataset.title = title;
    item.dataset.content = content;
    item.textContent = title;
    return item;
}

// Add item click handler
document.getElementById('board-container').addEventListener('click', (event) => {
    if (event.target.matches('.add-item-btn')) {
        const targetListId = event.target.dataset.targetList;
        const targetList = document.getElementById(targetListId);
        if (targetList) {
            // Instead of immediately creating a new item, open the edit dialog
            // The list ID is passed to the edit dialog to know where to add the task if saved
            openNewTaskDialog(targetListId);
        }
    }
});

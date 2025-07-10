document.addEventListener('DOMContentLoaded', () => {
    // Initialize application logic
    initializeApp();
    initializeSettingsModal();
    initializeEditModal();
});

// --- HELPERS ---

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
 * NEW: Formats raw text into simple HTML based on markdown-like rules.
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

// --- DYNAMIC INITIALIZATION & API LOGIC ---

function renderBoard(boardData) {
    const board = document.getElementById('board');
    board.innerHTML = ''; // Clear loading message

    boardData.forEach(listData => {
        const listId = `list-${listData.header.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        const itemsHTML = listData.items.map(item => `
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
                    <h2>${listData.header}</h2>
                    <button class="add-item-btn" data-target-list="${listId}">+</button>
                </div>
                <ul id="${listId}" class="sortable-list">${itemsHTML}</ul>
            </div>
        `;
        board.insertAdjacentHTML('beforeend', columnHTML);
    });
}

async function initializeApp() {
    const board = document.getElementById('board');
    board.innerHTML = `<p id="board-message">Loading...</p>`;

    const baseUrl = localStorage.getItem('baseUrl');
    if (!baseUrl) {
        document.getElementById('board-message').innerHTML = 'Base URL not set. Please configure it in ⚙️ Settings.';
        return;
    }
    const user = localStorage.getItem('user') || '';
    const password = localStorage.getItem('password') || '';
    const headers = new Headers();
    if (user) headers.append('Authorization', 'Basic ' + btoa(user + ':' + password));

    try {
        // Stages 1 & 2: Fetch board structure and list details
        document.getElementById('board-message').textContent = 'Fetching board structure...';
        const structureUrl = `${baseUrl}/recipes/default/tiddlers/Tasks Privat`;
        const structureResponse = await fetch(structureUrl, { headers });
        if (!structureResponse.ok) throw new Error(`HTTP error fetching structure! Status: ${structureResponse.status}`);
        const structureData = await structureResponse.json();
        if (!structureData.fields?.list) throw new Error("'fields.list' not found in board structure response.");
        const orderedListIds = parseListString(structureData.fields.list);

        const listDetailsUrl = `${baseUrl}/recipes/default/tiddlers.json?filter=%5Btag%5BTasks Privat%5D%5D`;
        const listDetailsResponse = await fetch(listDetailsUrl, { headers });
        if (!listDetailsResponse.ok) throw new Error(`HTTP error fetching list details! Status: ${listDetailsResponse.status}`);
        const listDetailsData = await listDetailsResponse.json();
        const listDetailsMap = new Map(listDetailsData.map(item => [item.title, item]));

        // Stage 3: Fetch initial item details for each list
        document.getElementById('board-message').textContent = 'Fetching item details...';
        const itemDetailPromises = orderedListIds.map(id => {
            const detail = listDetailsMap.get(id);
            if (!detail) return Promise.resolve([]);
            const filter = encodeURIComponent(`[list[${detail.title}]]`);
            const url = `${baseUrl}/recipes/default/tiddlers.json?filter=${filter}`;
            return fetch(url, { headers }).then(res => res.ok ? res.json() : Promise.reject(`Failed for ${id}`));
        });
        const allItemDetails = await Promise.all(itemDetailPromises);

        // Stage 4: Combine all data for rendering
        const finalBoardData = orderedListIds.map((id, index) => {
            const listDetail = listDetailsMap.get(id);
            if (!listDetail) return null;

            const itemDetailsForList = allItemDetails[index];
            const itemDetailsMap = new Map(itemDetailsForList.map(item => [item.title, item]));

            const items = parseListString(listDetail.list).map(itemTitle => {
                const detail = itemDetailsMap.get(itemTitle);
                return {
                    realTitle: itemTitle,
                    displayTitle: detail?.shorttext || itemTitle,
                    content: detail?.text || 'Details not loaded.'
                };
            });

            // Strip single quotes from header text if it comes from shorttext
            let headerText = listDetail.shorttext || id.replace('tid/Privat/', '');
            if (listDetail.shorttext) {
                headerText = headerText.replace(/^'|'$/g, '');
            }

            return { header: headerText, items: items };
        }).filter(Boolean);

        renderBoard(finalBoardData);

    } catch (error) {
        document.getElementById('board-message').textContent = `Failed to load board: ${error.message}. Check console and settings.`;
        console.error('API Error:', error);
    }
}

// --- Drag and Drop Logic (Unchanged) ---
let placeholder = null;
interact('.sortable-item').draggable({ inertia: true, autoScroll: true, listeners: { start(e) { const i=e.target; i.classList.add('dragging'); placeholder=document.createElement('li'); placeholder.className='drop-placeholder'; placeholder.style.height=`${i.offsetHeight}px`; i.parentNode.insertBefore(placeholder,i.nextSibling); }, move: dragMoveListener, end(e) { const i=e.target; i.classList.remove('dragging'); i.style.transform='none'; i.removeAttribute('data-x'); i.removeAttribute('data-y'); if(placeholder&&placeholder.parentNode){placeholder.parentNode.removeChild(placeholder);} placeholder=null; } } });
function dragMoveListener(e) { const i=e.target,x=(parseFloat(i.getAttribute('data-x'))||0)+e.dx,y=(parseFloat(i.getAttribute('data-y'))||0)+e.dy; i.style.transform=`translate(${x}px, ${y}px)`; i.setAttribute('data-x',x); i.setAttribute('data-y',y); const b=document.elementsFromPoint(e.clientX,e.clientY)[1]; if(!b)return; const z=b.closest('.sortable-list'); if(z){ const h=b.closest('.sortable-item'); if(h&&h!==i){ const r=h.getBoundingClientRect(),m=r.top+r.height/2; if(e.clientY<m){h.parentNode.insertBefore(placeholder,h);}else{h.parentNode.insertBefore(placeholder,h.nextSibling);}}else if(!h){z.appendChild(placeholder);}}}
interact('.sortable-list').dropzone({ accept: '.sortable-item', listeners: { drop(e) { const d=e.relatedTarget; if(placeholder&&placeholder.parentNode){placeholder.parentNode.replaceChild(d,placeholder);}} } });

// --- Add Item Logic (Unchanged) ---
function createNewItemElement() { const item = document.createElement('li'); item.className = 'sortable-item'; item.dataset.id = `item-${Date.now()}`; item.dataset.title = 'New Task'; item.dataset.content = 'Click to add details.'; item.textContent = 'New Task'; return item; }
document.getElementById('board').addEventListener('click', (event) => { if (event.target.matches('.add-item-btn')) { const targetListId = event.target.dataset.targetList; const targetList = document.getElementById(targetListId); if (targetList) { const newItem = createNewItemElement(); targetList.prepend(newItem); } } });

// --- Edit Item Modal Logic ---
function initializeEditModal() {
    const dialog = document.getElementById('edit-modal');
    const titleInput = document.getElementById('modal-title-input');
    const contentDisplay = document.getElementById('modal-content-display'); // NEW
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

        // Show loading state in both elements
        contentDisplay.innerHTML = '<p>Loading content...</p>';
        contentTextarea.value = 'Loading content...';

        setEditModalState('view');
        dialog.showModal();

        const baseUrl = localStorage.getItem('baseUrl');
        const realTitle = item.dataset.realTitle;
        if (!baseUrl || !realTitle) {
            const errorMsg = 'Error: Missing configuration or item title.';
            contentDisplay.innerHTML = `<p>${errorMsg}</p>`;
            contentTextarea.value = errorMsg;
            return;
        }

        const user = localStorage.getItem('user') || '';
        const password = localStorage.getItem('password') || '';
        const headers = new Headers();
        if (user) headers.append('Authorization', 'Basic ' + btoa(user + ':' + password));

        try {
            const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(realTitle)}`;
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const data = await response.json();
            const newContent = data.text ?? data.fields?.text ?? 'Content not found in response.';

            // Populate both the display div and the textarea
            contentDisplay.innerHTML = formatContentToHtml(newContent);
            contentTextarea.value = newContent;
            item.dataset.content = newContent;
        } catch (error) {
            console.error('Failed to fetch item content:', error);
            const errorMsg = `Failed to load content. Error: ${error.message}`;
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

// --- Settings Modal Logic (Unchanged) ---
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

// dragdrop.js - Drag and drop functionality with left-side-only dragging

let draggedItem = null;

/**
 * Initializes the drag and drop functionality
 * Only the left half of each task is draggable
 */
function initializeDragAndDrop() {
    // First, add drag handles to all sortable items
    addDragHandlesToItems();
    
    // Set up a mutation observer to add drag handles to new items
    setupMutationObserver();
    
    // Initialize interact.js with the drag handle selector
    interact('.drag-handle').draggable({
        inertia: false,
        autoScroll: true,
        modifiers: [],
        // Ensure we only handle events on the drag handle
        allowFrom: '.drag-handle',
        // Important: This makes the element available for dropping on dropzones
        dropzone: true,
        listeners: {
            start(event) {
                // Prevent default to avoid browser handling
                event.preventDefault();
                
                // Get the parent sortable item
                draggedItem = event.target.closest('.sortable-item');
                if (!draggedItem) return;
                
                // Add visual feedback
                draggedItem.classList.add('dragging');
                
                // Dispatch custom event for column selector integration
                document.dispatchEvent(new CustomEvent('taskDragStart', { detail: { item: draggedItem } }));
                
                // Create a placeholder that stays in place to show where the item was
                const placeholder = document.createElement('div');
                placeholder.classList.add('drop-placeholder');
                placeholder.style.height = `${draggedItem.offsetHeight}px`;
                
                // Insert placeholder where the item was
                draggedItem.parentNode.insertBefore(placeholder, draggedItem);
                
                // Move the actual item to the end of the document body for absolute positioning
                document.body.appendChild(draggedItem);
                
                // Set initial position
                const rect = placeholder.getBoundingClientRect();
                draggedItem.style.position = 'fixed';
                draggedItem.style.zIndex = '1000';
                draggedItem.style.width = `${rect.width}px`;
                draggedItem.style.left = `${rect.left}px`;
                draggedItem.style.top = `${rect.top}px`;
                
                // Store initial position for calculations
                draggedItem.setAttribute('data-x', rect.left);
                draggedItem.setAttribute('data-y', rect.top);
                draggedItem.setAttribute('data-placeholder-id', placeholder.id || `placeholder-${Date.now()}`);
                if (!placeholder.id) placeholder.id = draggedItem.getAttribute('data-placeholder-id');
            },
            move(event) {
                // Prevent default to avoid browser handling
                event.preventDefault();
                
                if (!draggedItem) return;
                
                // Update position
                const x = (parseFloat(draggedItem.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(draggedItem.getAttribute('data-y')) || 0) + event.dy;
                
                // Move the dragged element directly with fixed positioning
                draggedItem.style.left = `${x}px`;
                draggedItem.style.top = `${y}px`;
                
                // Store position
                draggedItem.setAttribute('data-x', x);
                draggedItem.setAttribute('data-y', y);
                
                // Dispatch custom event for column selector integration
                document.dispatchEvent(new CustomEvent('taskDragMove', { 
                    detail: { 
                        item: draggedItem,
                        clientX: event.clientX,
                        clientY: event.clientY 
                    } 
                }));
                
                // Find the list and position where we should move the placeholder
                const elementsUnder = document.elementsFromPoint(event.clientX, event.clientY);
                
                // Find a list or item under the pointer
                for (const el of elementsUnder) {
                    if (el === draggedItem) continue;
                    
                    // If we're over another item
                    if (el.classList.contains('sortable-item') || el.classList.contains('drop-placeholder')) {
                        const rect = el.getBoundingClientRect();
                        const list = el.closest('.sortable-list');
                        if (!list) continue;
                        
                        const placeholder = document.getElementById(draggedItem.getAttribute('data-placeholder-id'));
                        if (!placeholder) continue;
                        
                        // Only move if we're not already in the right position
                        if (placeholder.nextElementSibling === el || placeholder.previousElementSibling === el) {
                            // We're already adjacent to this element
                            if ((event.clientY < rect.top + rect.height / 2 && placeholder.nextElementSibling === el) ||
                                (event.clientY >= rect.top + rect.height / 2 && placeholder.previousElementSibling === el)) {
                                // We're on the same side of the element as before, no need to move
                                break;
                            }
                        }
                        
                        // Move the placeholder before or after the element
                        if (event.clientY < rect.top + rect.height / 2) {
                            list.insertBefore(placeholder, el);
                        } else {
                            list.insertBefore(placeholder, el.nextElementSibling);
                        }
                        break;
                    }
                    
                    // If we're over an empty list
                    if (el.classList.contains('sortable-list')) {
                        const placeholder = document.getElementById(draggedItem.getAttribute('data-placeholder-id'));
                        if (!placeholder || el.contains(placeholder)) continue;
                        
                        // Move placeholder to this list
                        el.appendChild(placeholder);
                        break;
                    }
                }
            },
            end(event) {
                // Prevent default to avoid browser handling
                event.preventDefault();
                
                if (!draggedItem) return;
                
                // Check if we're dropping on a column selector item
                const elementsUnder = document.elementsFromPoint(event.clientX, event.clientY);
                let droppedOnColumnItem = false;
                
                // Get the placeholder and its position information before removing it
                const placeholder = document.getElementById(draggedItem.getAttribute('data-placeholder-id'));
                let placeholderNextSibling = null;
                let placeholderParent = null;
                
                if (placeholder && placeholder.parentNode) {
                    // Store the placeholder's position information
                    placeholderNextSibling = placeholder.nextElementSibling;
                    placeholderParent = placeholder.parentNode;
                    
                    // Now remove the placeholder
                    placeholder.remove();
                }
                
                for (const el of elementsUnder) {
                    if (el.classList && el.classList.contains('column-selector-item')) {
                        // We're dropping on a column selector item
                        droppedOnColumnItem = true;
                        
                        // Trigger the drop event on the column selector item
                        const dropEvent = new Event('drop');
                        el.dispatchEvent(dropEvent);
                        
                        // We'll let the column selector handle the drop, so we don't need to do anything else here
                        break;
                    }
                }
                
                // Dispatch custom event for column selector integration
                document.dispatchEvent(new CustomEvent('taskDragEnd', { detail: { item: draggedItem } }));
                
                // If we didn't drop on a column selector item, handle the drop normally
                if (!droppedOnColumnItem) {
                    // Reset the dragged item's styles
                    draggedItem.style.position = '';
                    draggedItem.style.zIndex = '';
                    draggedItem.style.width = '';
                    draggedItem.style.left = '';
                    draggedItem.style.top = '';
                    draggedItem.style.transform = '';
                    draggedItem.classList.remove('dragging');
                    
                    // Insert the item at the position where the placeholder was
                    if (placeholderParent) {
                        // If we have position information, insert at that position
                        if (placeholderNextSibling) {
                            // Insert before the next sibling (middle of the list)
                            placeholderParent.insertBefore(draggedItem, placeholderNextSibling);
                        } else {
                            // No next sibling means it was at the end of the list
                            placeholderParent.appendChild(draggedItem);
                        }
                    } else {
                        // Fallback: add to the sortable list if we don't have position info
                        const sortableList = document.querySelector('.sortable-list');
                        if (sortableList) {
                            sortableList.appendChild(draggedItem);
                        }
                    }
                    
                    // Update the data structure to reflect the new order
                    updateTaskOrderInDataStructure();
                }
                
                // Clean up
                if (draggedItem) {
                    draggedItem.removeAttribute('data-x');
                    draggedItem.removeAttribute('data-y');
                    draggedItem.removeAttribute('data-placeholder-id');
                    draggedItem = null;
                }
            }
        }
    });
}

/**
 * Adds drag handles to all sortable items
 */
function addDragHandlesToItems() {
    document.querySelectorAll('.sortable-item').forEach(item => {
        // Only add if it doesn't already have a drag handle
        if (!item.querySelector('.drag-handle')) {
            addDragHandleToItem(item);
        }
    });
}

/**
 * Adds a drag handle to a single sortable item
 * @param {HTMLElement} item - The sortable item element
 */
function addDragHandleToItem(item) {
    // Skip if this item already has our structure
    if (item.querySelector('.drag-handle') || item.querySelector('.scroll-area')) {
        return;
    }
    
    // Create a drag handle that covers the left half of the item
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    
    // Create a content wrapper that spans the full width
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    
    // Clone the content instead of moving it directly
    // This preserves any event listeners attached to the content
    const content = item.innerHTML;
    item.innerHTML = '';
    contentWrapper.innerHTML = content;
    
    // Add the drag handle and content wrapper to the item
    item.appendChild(dragHandle);
    item.appendChild(contentWrapper);
    
    // Make sure the item height adjusts to content
    // Set a small timeout to let the browser render the content first
    setTimeout(() => {
        // Get the content height
        const contentHeight = contentWrapper.offsetHeight;
        if (contentHeight > 0) {
            // Make sure the item is at least as tall as its content
            item.style.minHeight = contentHeight + 'px';
        }
        
        // Also handle dynamic content changes
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const newContentHeight = contentWrapper.offsetHeight;
                if (newContentHeight > 0) {
                    item.style.minHeight = newContentHeight + 'px';
                }
            }
        });
        
        // Start observing the content wrapper
        resizeObserver.observe(contentWrapper);
    }, 50);
}

/**
 * Sets up a mutation observer to add drag handles to new items
 */
function setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node is a sortable item
                        if (node.classList && node.classList.contains('sortable-item')) {
                            addDragHandleToItem(node);
                        }
                        
                        // Check for sortable items within the added node
                        const sortableItems = node.querySelectorAll ? node.querySelectorAll('.sortable-item') : [];
                        sortableItems.forEach(item => {
                            addDragHandleToItem(item);
                        });
                    }
                });
            }
        });
    });
    
    // Start observing the document body for added nodes
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Updates the data structure to reflect the new order of tasks after drag and drop
 * This ensures the order persists when switching between columns
 */
function updateTaskOrderInDataStructure() {
    // Check if columnNavigator exists and is properly initialized
    if (typeof columnNavigator === 'undefined' || !columnNavigator.columns || !columnNavigator.columns.length) {
        console.error('Column navigator not available for updating task order');
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
    
    // Get the sortable list element that contains the tasks
    const sortableList = document.querySelector('.sortable-list');
    if (!sortableList) {
        console.error('Sortable list not found');
        return;
    }
    
    // Get all task items in their current order
    const taskItems = Array.from(sortableList.querySelectorAll('.sortable-item'));
    
    // Create a new array to hold the reordered tasks
    const reorderedTasks = taskItems.map(item => {
        // Find the corresponding task in the original data
        const realTitle = item.dataset.realTitle;
        const displayTitle = item.dataset.title;
        const content = item.dataset.content;
        
        return {
            realTitle: realTitle,
            displayTitle: displayTitle,
            content: content
        };
    });
    
    // Update the column's items array with the new order
    currentColumn.items = reorderedTasks;
    
    console.log('Task order updated in data structure for column:', currentColumn.header);
}


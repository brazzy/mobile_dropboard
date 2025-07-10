// dragdrop.js - Drag and drop functionality

let draggedItem = null;

function initializeDragAndDrop() {
    interact('.sortable-item').draggable({
        inertia: false,  // Disable inertia for more direct control
        autoScroll: true,
        listeners: {
            start(event) {
                // Store reference to dragged item
                draggedItem = event.target;
                
                // Add visual feedback
                draggedItem.classList.add('dragging');
                
                // Create a clone that stays in place to show where the item was
                const placeholder = draggedItem.cloneNode(true);
                placeholder.classList.add('drop-placeholder');
                placeholder.classList.remove('dragging', 'sortable-item');
                placeholder.removeAttribute('data-x');
                placeholder.removeAttribute('data-y');
                placeholder.style.transform = '';
                
                // Insert placeholder where the item was
                draggedItem.parentNode.insertBefore(placeholder, draggedItem);
                
                // Move the actual item to the end of the document body for absolute positioning
                // This prevents layout shifts that cause flickering
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
                if (!draggedItem) return;
                
                // Find the placeholder
                const placeholder = document.getElementById(draggedItem.getAttribute('data-placeholder-id'));
                if (placeholder && placeholder.parentNode) {
                    // Move the real item back to the DOM where the placeholder is
                    draggedItem.style.position = '';
                    draggedItem.style.zIndex = '';
                    draggedItem.style.width = '';
                    draggedItem.style.left = '';
                    draggedItem.style.top = '';
                    draggedItem.style.transform = '';
                    draggedItem.classList.remove('dragging');
                    
                    // Replace placeholder with the real item
                    placeholder.parentNode.replaceChild(draggedItem, placeholder);
                }
                
                // Clean up
                draggedItem.removeAttribute('data-x');
                draggedItem.removeAttribute('data-y');
                draggedItem.removeAttribute('data-placeholder-id');
                draggedItem = null;
            }
        }
    });
}

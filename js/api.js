// api.js - Communication with backend

/**
 * Creates headers with basic authentication from localStorage credentials
 * @returns {Headers} Headers object with Authorization if credentials exist
 */
function createAuthHeaders() {
    const user = localStorage.getItem('user') || '';
    const password = localStorage.getItem('password') || '';
    const headers = new Headers();
    if (user) headers.append('Authorization', 'Basic ' + btoa(user + ':' + password));
    return headers;
}

/**
 * Fetches board data from the backend
 * @returns {Promise<Object>} Object containing column data and status information
 */
async function fetchBoardData(boardName) {
    const baseUrl = localStorage.getItem('baseUrl');
    if (!baseUrl) {
        return { success: false, error: 'Base URL not set. Please configure it in ⚙️ Settings.' };
    }

    const headers = createAuthHeaders();
    try {
        // Stage 1: Fetch board structure
        const structureUrl = `${baseUrl}/recipes/default/tiddlers/${boardName}`;
        const structureResponse = await fetch(structureUrl, { headers });
        if (!structureResponse.ok) throw new Error(`HTTP error fetching structure! Status: ${structureResponse.status}`);
        const structureData = await structureResponse.json();
        if (!structureData.fields?.list) throw new Error("'fields.list' not found in board structure response.");
        const orderedListIds = parseListString(structureData.fields.list);

        // Stage 2: Fetch list details
        const listDetailsUrl = `${baseUrl}/recipes/default/tiddlers.json?filter=%5Btag%5B${boardName}%5D%5D`;
        const listDetailsResponse = await fetch(listDetailsUrl, { headers });
        if (!listDetailsResponse.ok) throw new Error(`HTTP error fetching list details! Status: ${listDetailsResponse.status}`);
        const listDetailsData = await listDetailsResponse.json();
        const listDetailsMap = new Map(listDetailsData.map(item => [item.title, item]));

        // Stage 3: Fetch initial item details for each list
        const itemDetailPromises = orderedListIds.map(id => {
            const detail = listDetailsMap.get(id);
            if (!detail) return Promise.resolve([]);
            const filter = encodeURIComponent(`[list[${detail.title}]]`);
            const url = `${baseUrl}/recipes/default/tiddlers.json?filter=${filter}`;
            return fetch(url, { headers }).then(res => res.ok ? res.json() : Promise.reject(`Failed for ${id}`));
        });
        const allItemDetails = await Promise.all(itemDetailPromises);

        // Stage 4: Combine all data for rendering
        const finalColumnData = orderedListIds.map((id, index) => {
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
            let headerText = listDetail.shorttext;
            if (listDetail.shorttext) {
                headerText = headerText.replace(/\'\'/g, '');
            }

            return { id: id,header: headerText, items: items };
        }).filter(Boolean);

        return { success: true, data: finalColumnData };

    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches content for a specific task item from the backend
 * @param {string} realTitle - The real title of the task item
 * @returns {Promise<Object>} - Object containing the fetched content and status information
 */
async function fetchTask(realTitle) {
    const baseUrl = localStorage.getItem('baseUrl');
    if (!baseUrl || !realTitle) {
        return { success: false, error: 'Error: Missing configuration or item title.' };
    }

    const headers = createAuthHeaders();
    try {
        const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(realTitle)}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        
        return { success: true, task: data };
    } catch (error) {
        console.error('Failed to fetch item content:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Moves a task from one column to another
 * @param {number} targetColumnIndex - The index of the column to move the task to
 * @param {string} taskRealTitle - The real title of the task to move
 * @returns {Promise<Object>} - Object containing status information
 */
async function moveTaskBetween(targetColumnIndex, taskRealTitle) {
    // Validate inputs
    if (targetColumnIndex === undefined || !taskRealTitle) {
        return { success: false, error: 'Missing required parameters' };
    }
    
    // Check if columnNavigator is available
    if (!columnNavigator || !columnNavigator.columns) {
        return { success: false, error: 'Column navigator not available' };
    }
    
    // Get current and target columns
    const currentColumn = columnNavigator.columns[columnNavigator.currentColumnIndex]
    const targetColumn = columnNavigator.columns[targetColumnIndex];
    
    if (!currentColumn || !targetColumn) {
        return { success: false, error: 'Invalid column indices' };
    }
    
    try {
        // Step 2: Update the sort order of the current column (removing the task)
        await updateSortOrder(currentColumn);
        
        // Step 4: Update the sort order of the target column (adding the task)
        await updateSortOrder(targetColumn);
        
        // Step 5: Fetch the task data
        const taskResult = await fetchTask(taskRealTitle);
        if (!taskResult.success) {
            throw new Error(`Failed to fetch task data: ${taskResult.error}`);
        }
        
        // Step 6: Update the task's tags
        const taskData = taskResult.task;
        
        // Parse the tags (space-separated list with entries containing spaces enclosed in double square brackets)
        let tags = [];
        if (taskData.tags) {
            // Match either [[tag with spaces]] or single-word-tag
            const tagRegex = /\[\[(.*?)\]\]|\S+/g;
            let match;
            while ((match = tagRegex.exec(taskData.tags)) !== null) {
                // If it's a tag with spaces (group 1 will be defined), use that, otherwise use the full match
                tags.push(match[1] || match[0]);
            }
        }
        
        // Remove the current column title from tags
        tags = tags.filter(tag => tag !== currentColumn.id);
        
        // Add the target column title to tags if it's not already there
        if (!tags.includes(targetColumn.id)) {
            tags.push(targetColumn.id);
        }
        
        // Format the tags back into the required format
        taskData.tags = tags.map(tag => 
            tag.includes(' ') ? `[[${tag}]]` : tag
        ).join(' ');
        
        // Step 7: Save the updated task data to the backend
        const baseUrl = localStorage.getItem('baseUrl');
        if (!baseUrl) {
            return { success: false, error: 'Base URL not set' };
        }
        
        const headers = createAuthHeaders();
        headers.append('Content-Type', 'application/json');
        headers.append('X-Requested-With', 'TiddlyWiki');
        
        const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(taskRealTitle)}`;
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(taskData)
        });
        
        if (!putResponse.ok) {
            throw new Error(`HTTP Error updating task: ${putResponse.status}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to move task between columns:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates the sort order of tasks in a column
 * @param {string} columnTitle - The title of the column to update
 * @param {string[]} taskTitles - Array of task titles in the desired order
 * @returns {Promise<Object>} - Object containing status information
 */
async function updateSortOrder(column) {
    const taskTitles = column.items.map(item => item.realTitle);
    const columnTitle = column.id;
    const baseUrl = localStorage.getItem('baseUrl');
    if (!baseUrl || !columnTitle) {
        return { success: false, error: 'Error: Missing configuration or column title.' };
    }

    const headers = createAuthHeaders();
    headers.append('Content-Type', 'application/json');
    headers.append('X-Requested-With', 'TiddlyWiki');
    
    try {
        // First fetch the current column data
        const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(columnTitle)}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const columnData = await response.json();
        
        // Format the task titles into the required format (space-separated with double square brackets for titles with spaces)
        const formattedList = taskTitles.map(title => 
            title.includes(' ') ? `[[${title}]]` : title
        ).join(' ');
        
        // Update the list property in the column data
        columnData.fields.list = formattedList;
        
        // Send the updated data back to the server
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(columnData)
        });
        
        if (!putResponse.ok) throw new Error(`HTTP Error updating column: ${putResponse.status}`);
        
        return { success: true };
    } catch (error) {
        console.error('Failed to update sort order:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Updates a task on the server
 * @param {string} realTitle - The unique identifier for the task
 * @param {string} title - The title of the task
 * @param {string} text - The content of the task
 * @returns {Promise<Object>} - Object containing status information
 */
async function updateTask(realTitle, title, text) {
    const baseUrl = localStorage.getItem('baseUrl');
    const headers = createAuthHeaders();
    headers.append('Content-Type', 'application/json');
    headers.append('X-Requested-With', 'TiddlyWiki');
    
    try {
        // First check if the task already exists
        const taskData = await fetchTask(realTitle);
        
        // If the task does not exist, return an error
        if (!taskData.success) {
            return { success: false, error: `Task with title "${realTitle}" does not exist.` };
        }
        const taskHasShorttext = taskData.task.fields && taskData.task.fields.shorttext;
        const titleChanged = !taskHasShorttext && realTitle != title;
        const newTitle = titleChanged ? title : realTitle;
        const oldTitle = realTitle;
        
        // Update the task data
        const currentTimestamp = new Date().getTime();
        taskData.task.modified = currentTimestamp;
        taskData.task.text = text;
        taskData.task.title = newTitle
        if(taskHasShorttext && taskData.task.fields.shorttext !== title) {
            taskData.task.fields.shorttext = title;
        }
        
      
        // Send the task data to the server
        const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(newTitle)}`;
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(taskData.task)
        });
        
        if (!putResponse.ok) throw new Error(`HTTP Error creating task: ${putResponse.status}`);
        
        if(titleChanged) {
            const deleteUrl = `${baseUrl}/bags/default/tiddlers/${encodeURIComponent(oldTitle)}`;
            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: headers
            });
            
            if (!deleteResponse.ok) throw new Error(`HTTP Error deleting old task: ${deleteResponse.status}`);

            const column = columnNavigator.columns[columnNavigator.currentColumnIndex];
            column.items.forEach(item => {
                if(item.realTitle === oldTitle) {
                    item.displayTitle = newTitle;
                    item.realTitle = newTitle;
                }
            });
            updateSortOrder(column);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to store task:', error);
        return { success: false, error: error.message };
    }
}

async function deleteTask(realTitle) {
    const baseUrl = localStorage.getItem('baseUrl');
    const headers = createAuthHeaders();
    headers.append('X-Requested-With', 'TiddlyWiki');

    try {
        const url = `${baseUrl}/bags/default/tiddlers/${encodeURIComponent(realTitle)}`;
        const deleteResponse = await fetch(url, {
            method: 'DELETE',
            headers: headers
        });
        
        if (!deleteResponse.ok) throw new Error(`HTTP Error deleting task: ${deleteResponse.status}`);
        
        return { success: true };
    } catch (error) {
        console.error('Failed to delete task:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Stores a new task to the server
 * @param {string} realTitle - The unique identifier for the task
 * @param {string} title - The title of the task
 * @param {string} text - The content of the task
 * @param {Column} column - The column where the task will be stored
 * @returns {Promise<Object>} - Object containing status information
 */
async function storeNewTask(realTitle, title, text, column) {
    const baseUrl = localStorage.getItem('baseUrl');
    const headers = createAuthHeaders();
    headers.append('Content-Type', 'application/json');
    headers.append('X-Requested-With', 'TiddlyWiki');
    
    try {
        // First check if the task already exists
        const checkResponse = await fetchTask(realTitle);
        
        // If the task exists, return an error
        if (checkResponse.success) {
            return { success: false, error: `Task with title "${realTitle}" already exists.` };
        }
        
        // Create the task data
        const currentTimestamp = new Date().getTime();
        let columnTitle = column.id;
        if(columnTitle.includes(' ')) {
            columnTitle = `[[${columnTitle}]]`;
        }
        const taskData = {
            bag: "default",
            type: "text/vnd.tiddlywiki",
            title: realTitle,
            text: text,
            tags: columnTitle,
            modified: currentTimestamp,
            created: currentTimestamp,
            fields: {
                shorttext: title
            }
        };
        
        // Send the task data to the server
        const url = `${baseUrl}/recipes/default/tiddlers/${encodeURIComponent(realTitle)}`;
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(taskData)
        });
        
        if (!putResponse.ok) throw new Error(`HTTP Error creating task: ${putResponse.status}`);
        
        return updateSortOrder(column);
    } catch (error) {
        console.error('Failed to store task:', error);
        return { success: false, error: error.message };
    }
}
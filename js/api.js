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
async function fetchTaskContent(realTitle) {
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
        const content = data.text ?? data.fields?.text ?? 'Content not found in response.';
        
        return { success: true, content };
    } catch (error) {
        console.error('Failed to fetch item content:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates the sort order of tasks in a column
 * @param {string} columnTitle - The title of the column to update
 * @param {string[]} taskTitles - Array of task titles in the desired order
 * @returns {Promise<Object>} - Object containing status information
 */
async function updateSortOrder(columnTitle, taskTitles) {
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
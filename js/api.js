// api.js - Communication with backend

/**
 * Fetches board data from the backend
 * @returns {Promise<Object>} Object containing column data and status information
 */
async function fetchBoardData(boardName) {
    const baseUrl = localStorage.getItem('baseUrl');
    if (!baseUrl) {
        return { success: false, error: 'Base URL not set. Please configure it in ⚙️ Settings.' };
    }
    
    const user = localStorage.getItem('user') || '';
    const password = localStorage.getItem('password') || '';
    const headers = new Headers();
    if (user) headers.append('Authorization', 'Basic ' + btoa(user + ':' + password));

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
            let headerText = listDetail.shorttext || id.replace('tid/Privat/', '');
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

    const user = localStorage.getItem('user') || '';
    const password = localStorage.getItem('password') || '';
    const headers = new Headers();
    if (user) headers.append('Authorization', 'Basic ' + btoa(user + ':' + password));

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

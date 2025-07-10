# PURPOSE
- "Mobile Dropboard" implements a mobile client for the Dropboard plugin of TiddlyWiki.

# FUNCTIONALITY
- It shows a Kanban board and allows rearranging the tasks via drag and drop. 
- Individual tasks can be opened to show details, and edited.

# BACKEND
- The board is populated by calling the API of TiddlyWiki to retrieve tasks. 
- A base URL and authentication data for  HTTP Basic Auth are stored in local storage 
  and can be edited via the application's settings.

# DEPENDENCIES
- the library interact.min.js is used for drag-and-drop

# STRUCTURE
- The application entry point is kanban.html
- style.css contains the stylesheet
- script.js contains the application logic 

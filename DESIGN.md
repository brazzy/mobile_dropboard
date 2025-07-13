# PURPOSE
- "Mobile Dropboard" implements a mobile client for the Dropboard plugin of TiddlyWiki.

# FUNCTIONALITY
- It shows a Kanban board and allows rearranging the tasks via drag and drop, using either a mouse or touchscreen. 
- Individual tasks can be opened to show details, and edited.
- The board has multiple columns that can contain tasks, but only one column is shown at a time. 
- The user can swipe left or right or use navigation buttons in the header to navigate between columns.

# BACKEND
- The board is populated by calling the API of TiddlyWiki to retrieve tasks. 
- A base URL and authentication data for  HTTP Basic Auth are stored in local storage 
  and can be edited via the application's settings.

# DEPENDENCIES
- the library interact.min.js is used for drag-and-drop functionality.

# STRUCTURE
- The application entry point is kanban.html
- style.css contains the stylesheet
- JavaScript code is organized into modular components in the js/ directory:
  - init.js: Setup, initialization, and helper functions
  - api.js: Communication with the backend TiddlyWiki server
  - settings.js: Settings management functionality
  - dragdrop.js: Drag and drop functionality for task management
  - editTask.js: Task editing functionality
  - main.js: Main entry point that initializes all components
  - swipe.js: Swipe navigation functionality

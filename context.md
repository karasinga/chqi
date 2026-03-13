# ResearchEval Context

## Overview
ResearchEval is a secure, web-based analytics dashboard designed as a "mission control" for research and evaluation projects. It combines robust Project Management features (Gantt charts, Critical Path analysis) with data visualization capabilities (Power BI embedding) and file management. Core problem solved: provides research teams with integrated tools for project planning, task management, timeline visualization, and data analytics in a unified interface.

## Tech Stack
- **Backend**: Django 6.0 (Django REST Framework), SQLite (development) / PostgreSQL (production)
- **Frontend**: React 18.3.1 (Vite), Material UI 6.4.0, React Router DOM 7.1.1
- **Visualization**: ReactFlow 11.11.4 (network diagrams), gantt-task-react 0.3.9 (Gantt charts), PowerBI Client React 1.4.0 (analytics embedding)
- **Utilities**: Dagre 0.8.5 (graph layout), html-to-image 1.11.13 (export functionality)
- **External Services**: Power BI (optional integration for dashboards)

## Architecture
Project follows a Django monolith backend with React SPA frontend architecture. Data flows from REST API endpoints to React components with Material UI styling. Key design patterns include ViewSets for CRUD operations, service layer for complex business logic (CPM calculations), and component-based React architecture.

**Project Structure**:
- `backend/`: Django project with apps (projects, pm, users)
- `frontend/`: React SPA with Vite build system
- `frontend/src/components/`: Reusable UI components
- `frontend/src/pages/`: Route-based page components
- Data flow: API calls → state management → component rendering → user interactions

## Key Components
- **Project Management (pm app)**: Task scheduling with dependency management, Critical Path Method analysis, Gantt chart visualization
- **Projects (projects app)**: Project CRUD, hierarchical file/folder management, Power BI report embedding
- **Users (users app)**: Role-based access control with four user types (admin, PI, coordinator, stakeholder)
- **Scheduling Service**: Topological sorting for task ordering, forward/backward pass CPM calculations
- **File Management**: Hierarchical folder structure, automatic file type detection, upload handling with size tracking

**Critical Dependencies**:
- Tasks depend on projects
- Files depend on projects and folders
- Scheduling service depends on task models
- Frontend components depend on API responses

## Entry Points
- **Main Execution**: `backend/manage.py runserver` (port 8000), `frontend/npm run dev` (port 5173)
- **API Endpoints**:
  - `/api/projects/`: Project CRUD operations
  - `/api/folders/`: File folder management
  - `/api/files/`: File upload/download
  - `/api/pm/tasks/`: Task management with CPM analysis
  - `/api/pm/tasks/critical_path/`: CPM calculations for project
  - `/api/pm/tasks/portfolio_summary/`: Portfolio-wide health metrics
- **Web Interface**: React SPA served on port 5173, Django admin on `/admin/`
- **CLI Commands**: Standard Django management commands (`migrate`, `createsuperuser`)

## Configuration
- **Environment Variables**: None explicitly required (development uses defaults)
- **Config Files**:
  - `backend/config/settings.py`: Django settings with CORS for frontend dev server
  - `frontend/vite.config.js`: Vite build configuration
  - `frontend/package.json`: NPM dependencies and scripts
- **Database**: SQLite for development, configurable for PostgreSQL production
- **Media Files**: File uploads stored in `media/` directory with URL routing

## Conventions
- **Naming Patterns**: Django app naming (snake_case), React component PascalCase, API endpoints RESTful
- **Code Organization**: Feature-based apps in backend, component-based structure in frontend
- **API Design**: DRF ViewSets with custom actions for complex operations (CPM calculations)
- **UI Patterns**: Material UI components with CHQI brand colors (navy #1a237e, teal #00bcd4), rounded corners (8-12px), elevation shadows
- **Data Patterns**: Bulk operations for efficiency (Task.objects.bulk_update), auto-deletion of files on model deletion
- **Styling**: Custom theme overrides in `theme.js`, consistent spacing and typography weights

## Lessons Learned & Bug Fixes

### 1. Connectivity & CORS
- **Port Conflicts**: Vite may switch from port `5173` to `5174` if the former is occupied. Always check the active frontend port.
- **CORS Configuration**: Ensure `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` includes all potential frontend URLs (e.g., `http://localhost:5173`, `http://localhost:5174`).

### 2. Frontend Stability
- **Import Verification**: Missing imports (e.g., `Tooltip`, `Stack`, `AssignmentIcon`) are a common cause of frontend crashes. Always verify imports when adding new UI elements.
- **JSX Integrity**: Avoid "garbage JSX" or incomplete components during rapid iteration, as they can break the entire build.

### 3. User Presence & Tracking
- **Heartbeat Mechanism**: To prevent the "Online Users" count from dropping to zero, a frontend heartbeat (pinging `/api/users/users/online_count/` every 2 minutes) is implemented in `Layout.jsx`.
- **Thresholds**: The `online_count` threshold in `users/views.py` is set to 15 minutes to account for periods of inactivity without logging users out.

### 4. Comprehensive Logging
- **Multi-File Backend Logs**: Backend logs are split into `debug.log` (all), `errors.log` (critical), and `django.log` (framework) for easier debugging.
- **Global Frontend Capture**: `frontend/src/utils/logger.js` uses `window.onerror` and `window.onunhandledrejection` to capture and send all browser errors to the backend `/api/pm/logs/` endpoint.

### 5. Activity & Navigation
- **Informative Logs**: The `ActivityLog` model requires `target_id` and `target_name` to be populated for logs to be clickable and useful in the dashboard.
- **Deep Linking**: Dashboard activity logs are linked to specific tasks or projects using `navigate` with query parameters (e.g., `?taskId=123`).

# ResearchEval: Mission Control for Research & Evaluation

## Overview
ResearchEval is a premium, web-based analytics dashboard designed as a "mission control" for research and evaluation projects. It integrates advanced Project Management (Gantt, Kanban, Critical Path) with data visualization (Power BI) and comprehensive activity tracking.

## Tech Stack
-   **Backend**: Django 6.0 (DRF)
-   **Frontend**: React 18 (Vite) + Material UI 6
-   **Database**: SQLite (Dev) / PostgreSQL (Prod)
-   **Logging**: Multi-file backend logging + Global frontend error capture

## Key Features
-   **Mission Control Dashboard**: Real-time portfolio health, critical path tasks, and team activity feed.
-   **Task Management Hub**: Dynamic Kanban and List views with drag-and-drop support.
-   **Critical Path Analysis**: Real-time CPM calculations and auto-scheduling of dependencies.
-   **Portfolio Intelligence**: Aggregate metrics across all projects with health scoring.
*   **File Management**: Hierarchical folder structure with auto-type detection.
-   **Presence Tracking**: Real-time online user count with heartbeat mechanism.
-   **Analytics**: Seamless Power BI embedding for deep data insights.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation
-   [Project Context](context.md): Architecture, conventions, and lessons learned.
-   [API Reference](API_REFERENCE.md): Detailed endpoint documentation and data structures.
-   [Dashboard Roadmap](research_dashboard_plan.md): Strategic plan and implementation status.

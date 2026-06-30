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

---

## KoboToolbox Ingestion Pipeline

The project includes an ingestion pipeline to pull patient-level submissions from the KoboToolbox API into the local PostgreSQL database, exposing them as unnested records for Power BI analytics.

### Architecture
- **Raw Storage**: Full unmodified API JSON payloads are saved to the `raw_payload` (JSONB) column in `kobo.raw_submissions` for safety and audit trails.
- **Idempotency**: Submissions are upserted based on Kobo's unique `_id`. Running the pipeline repeatedly or with looking back is safe.
- **Incremental Loading**: Fetches only new/modified records using Kobo's `_last_modified` key, with a 2-day overlap safety window.
- **Analytical View**: The view `kobo.v_moh763_unnested` splits space-separated reported conditions into individual rows for direct binding in Power BI.

### Configuration
Add these keys to your `.env` or application config in Coolify:
```env
KOBO_TOKEN=your_token_here
KOBO_FORM_ID=your_form_asset_uid
KOBO_BASE_URL=https://kf.kobotoolbox.org
```

### Usage
Run the ingestion manually from the backend folder:
```bash
# Incremental daily run
python manage.py pull_kobo

# Full historical run
python manage.py pull_kobo --full
```

### Automation via Coolify
In the Coolify dashboard for your backend application, go to **Scheduled Tasks** / **Tasks** and add:
- **Command**: `python manage.py pull_kobo --scheduled`
- **Cron**: `0 20 * * *` (Runs daily at 11 PM EAT / 8 PM UTC)


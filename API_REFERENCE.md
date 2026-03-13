# ResearchEval API Reference

This document provides a comprehensive overview of the REST API endpoints available in the ResearchEval project.

## Base URL
- **Development**: `http://localhost:8000/api/`

---

## 1. Projects (`/projects/`)
Managed by the `projects` app.

### Endpoints
- `GET /projects/`: List all projects.
- `POST /projects/`: Create a new project.
- `GET /projects/{id}/`: Retrieve project details.
- `PUT /projects/{id}/`: Update a project.
- `DELETE /projects/{id}/`: Delete a project.

---

## 2. Tasks (`/pm/tasks/`)
Managed by the `pm` app. Includes Critical Path Method (CPM) integration.

### Endpoints
- `GET /pm/tasks/`: List all tasks (annotated with `comment_count`).
- `POST /pm/tasks/`: Create a new task (triggers auto-scheduling).
- `GET /pm/tasks/{id}/`: Retrieve task details.
- `PUT /pm/tasks/{id}/`: Update a task (logs assignments and status changes).

### Custom Actions
- `GET /pm/tasks/critical_path/?project_id={id}`: Returns CPM metrics for a specific project.
    - **Response**: List of tasks with `es`, `ef`, `ls`, `lf`, `slack`, and `is_critical`.
- `GET /pm/tasks/global_stats/`: Returns aggregate stats for the dashboard.
    - **Response**: `{ "critical_path_tasks": int, "overdue_tasks": int }`
- `GET /pm/tasks/portfolio_summary/`: Returns health metrics for all projects.
    - **Response**: List of projects with `health_score`, `critical_path` sequence, and `status_counts`.

---

## 3. Files & Folders (`/projects/folders/`, `/projects/files/`)
Hierarchical file management system.

### Folders
- `GET /projects/folders/`: List all folders.
- `GET /projects/folders/tree/?project={id}`: Returns the complete hierarchical tree of folders and root files.

### Files
- `GET /projects/files/`: List all files.
- `POST /projects/files/`: Upload a file (auto-detects `file_type` and `file_size`).
- `DELETE /projects/files/{id}/`: Delete a file (auto-removes from filesystem).

---

## 4. Collaboration (`/pm/comments/`, `/pm/activity/`)
Tracking user interactions and task discussions.

### Comments
- `GET /pm/comments/?task={id}`: List comments for a specific task.
- `POST /pm/comments/`: Add a comment (logs activity).

### Activity Log
- `GET /pm/activity/`: Read-only list of all system activities.
    - **Actions**: `create`, `update`, `delete`, `comment`, `assigned`, `status_change`.

---

## 5. Users & Presence (`/users/users/`)
User management and real-time presence tracking.

### Endpoints
- `GET /users/users/`: List all users.
- `GET /users/users/online_count/`: Returns the number of users active within the last 15 minutes.
    - **Response**: `{ "count": int }`

---

## 6. System Logs (`/pm/logs/`)
Frontend error reporting.

### Endpoints
- `POST /pm/logs/`: Accepts frontend logs and writes them to the backend `frontend` logger.
    - **Payload**: `{ "level": string, "message": string, "stack": string, "componentStack": string }`

---

## Data Enums

### Task Status
- `todo`: To Do
- `in_progress`: In Progress
- `review`: Review
- `completed`: Completed

### Task Priority
- `low`: Low
- `medium`: Medium
- `high`: High
- `critical`: Critical (Auto-assigned to critical path tasks)

### File Types
- `excel`, `csv`, `word`, `pdf`, `audio`, `video`, `image`, `other`

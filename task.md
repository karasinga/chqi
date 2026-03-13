# Project Task List: ResearchEval 2026

This document tracks the implementation status of features and bug fixes for the ResearchEval project.

## Completed Tasks

### 1. Core Infrastructure & Planning
- [x] Explore existing codebase and architecture
- [x] Create comprehensive implementation plans for Dashboard and Task Management
- [x] Define premium color palette (Navy #1a237e, Teal #00bcd4) and typography

### 2. UI/UX Overhaul (Mission Control)
- [x] Update `Layout.jsx` with a collapsible, sticky sidebar
- [x] Implement user profile section with real-time online indicator
- [x] Redesign `Dashboard.jsx` with premium stats widgets and independent scrolling
- [x] Redesign `PortfolioHub.jsx` for high-density project monitoring
- [x] Implement premium two-level delete confirmation modals
- [x] Refine "running within" date logic for projects
- [x] Filter "Team Workload" widget based on filtered projects
- [x] Filter "Task Distribution" widget based on filtered projects
- [x] Filter "My Tasks" widget based on filtered projects
- [x] Filter "Upcoming Deadlines" widget based on filtered projects
- [x] Filter "Recent Activity" widget based on filtered projects
- [x] Fix Critical Path Discrepancy (Dashboard vs Portfolio Hub)
- [x] Improve Sidebar Icon Visibility (Tinted Background)
- [x] Unify Portfolio Hub Theme (Switch to Light Mode)
- [x] Refine Portfolio Hub Aesthetics (Visible Text & Premium Styles)
- [x] Implement Project Navigation (Clickable Cards in Portfolio Hub)
- [x] Enhance Task Creation Context (Project Selector & Scoped Dependencies)
- [x] Unify Portfolio Hub UX/UI (Remove Isolated Theme & Standardize Shadows)
- [x] Enhance Error Logging (Global Error Boundary & Runtime Capture)

### 3. Task Management Hub
- [x] Create `TaskManagement.jsx` with List and Kanban views
- [x] Implement Drag-and-Drop functionality for Kanban status changes
- [x] Enhance `TaskForm.jsx` with status, priority, and assignee selection
- [x] Add task editing and deletion capabilities
- [x] Resolve critical JSX syntax errors and missing imports
- [ ] **User Mentions**: Add `@username` support in task comments.
- [ ] **Project Templates**: Create pre-defined task structures for common research types.
- [ ] **Dark Mode Toggle**: Implement a full system-wide dark/light mode switcher.

### Low Priority
- [ ] **Mobile App**: Explore React Native for a dedicated mobile companion app.
- [ ] **AI Insights**: Integrate LLM analysis to suggest project optimizations based on CPM data.

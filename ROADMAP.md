# CHQI Dashboard 2026 - Project Roadmap

This document tracks the long-term vision, pending features, and completed milestones for the CHQI Dashboard project.

## 🟢 Current Status: Stability & Modernization
We have recently migrated to React Query, resolved systemic ReferenceErrors, and implemented background polling for real-time data synchronization.

## 📋 Pending Tasks & Future Features

### Short-Term (Immediate Backlog)
- [ ] **Advanced Analytics**: Implement more detailed breakdowns in the Task Distribution widget (currently shows percentages).
- [ ] **User Role Management**: Enhance backend/frontend to support different user roles (Admin, Researcher, Project Manager).
- [ ] **Data Export**: Add functionality to export portfolio summaries to PDF or Excel for external reporting.

### Medium-Term (Feature Enhancements)
- [ ] **Global Search**: Implement a centralized search bar in the layout to find tasks or projects from any page.
- [ ] **Custom KPI Configuration**: Allow users to define what "At Risk" or "Critical" means via a settings panel.
- [ ] **Performance Optimization**: Profile and optimize data fetching for scenarios with 100+ projects.

### Long-Term (Strategic Vision)
- [ ] **Mobile App Integration**: Build a companion mobile view or app for on-the-go health checks.
- [ ] **Predictive Analysis**: Use project historical data to predict potential delays or risks.

## ✅ Completed Milestones
- [x] **React Query Integration**: Consistent data fetching and caching across the frontend.
- [x] **Portfolio Dashboard Fixes**: Resolved zero metrics and added missing API imports.
- [x] **Real-time Synchronization**: Implemented 30-second background polling.
- [x] **Standardized Verification Workflow**: Created `.agent/workflows/verify-changes.md` and `VERIFY.md`.
- [x] **Unified UI/UX**: Standardized the theme for the Portfolio Dashboard.

---
*Last Updated: 2026-01-09*

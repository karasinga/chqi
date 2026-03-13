# System Verification Checklist

This file provides a standard checklist for verifying system health after any changes. These steps are also automated via the agent workflow at `.agent/workflows/verify-changes.md`.

## Backend Checks
- [ ] **Run Server Check**: `python manage.py check`
- [ ] **Inspect Error Logs**: `tail -n 20 backend/logs/errors.log`
- [ ] **Run Backend Tests**: `python manage.py test`

## Frontend Checks
- [ ] **Frontend Build**: `npm run build` (Run in the `frontend` directory)
- [ ] **Verify Live Dashboard**: Open `http://localhost:5173/portfolio` and ensure metrics are non-zero.

---
*Note: The agent is programmed to run these automatically during the VERIFICATION phase.*

---
description: Standard verification process after code changes
---

// turbo-all
1. **Check Backend Status**: Run `python manage.py check` to ensure the project configuration is valid.
2. **Inspect Error Logs**: Run `tail -n 20 backend/logs/errors.log` to catch any silent failures during the current session.
3. **Run Backend Tests**: Execute `python manage.py test` to ensure no regressions in the API layer.
4. **Check Frontend Build**: Run `npm run build` in the `frontend` directory to ensure no TypeScript or syntax errors.
5. **Verify UI (Manual/Browser)**: Open the browser to `http://localhost:5173/portfolio` and verify metrics are non-zero.
6. **Maintenance**: Review and update `ROADMAP.md` in the project root to reflect completed work and identify next steps.

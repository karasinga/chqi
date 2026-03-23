"""
scheduleValidator.py — Schedule Validation Engine
==================================================
Validates a project's schedule before / during CPM calculation.

validate_schedule(project_id) → {'errors': [...], 'warnings': [...]}

Checks performed:
  1. Circular dependencies (topological sort)
  2. Self-dependency (task is its own predecessor)
  3. Milestone tasks with duration > 0
  4. Orphan tasks (no predecessors, starts on project start — warning only)
  5. Impossible constraints (must_start_on / must_finish_on conflicts with
     predecessor logic)
"""

from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)


def validate_schedule(project_id):
    """
    Run all validation checks for a project.
    Returns {'errors': [...], 'warnings': [...]}.
    Errors block scheduling; warnings are informational.
    """
    from pm.models import Task, Dependency
    from projects.models import Project

    errors = []
    warnings = []

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        errors.append(f"Project {project_id} not found.")
        return {'errors': errors, 'warnings': warnings}

    tasks = list(Task.objects.filter(project_id=project_id))
    dependencies = list(Dependency.objects.filter(project_id=project_id))
    task_map = {t.id: t for t in tasks}

    if not tasks:
        return {'errors': errors, 'warnings': warnings}

    # ── 1. Self-dependency check ─────────────────────────────────
    for dep in dependencies:
        if dep.predecessor_task_id == dep.successor_task_id:
            t_name = task_map.get(dep.predecessor_task_id, {}).name if dep.predecessor_task_id in task_map else f"ID:{dep.predecessor_task_id}"
            errors.append(
                f"Task '{t_name}' cannot be its own predecessor."
            )

    # ── 2. Circular dependency detection (Kahn's algo) ───────────
    in_degree = defaultdict(int)
    adj = defaultdict(list)
    task_ids = set(task_map.keys())

    for dep in dependencies:
        p, s = dep.predecessor_task_id, dep.successor_task_id
        if p not in task_ids or s not in task_ids:
            continue
        adj[p].append(s)
        in_degree[s] += 1

    for t_id in task_ids:
        if t_id not in in_degree:
            in_degree[t_id] = 0

    queue = deque([t_id for t_id in task_ids if in_degree[t_id] == 0])
    visited = []
    while queue:
        u = queue.popleft()
        visited.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    if len(visited) != len(task_ids):
        cycle_task_ids = {t for t, deg in in_degree.items() if deg > 0}
        cycle_names = [task_map[i].name for i in cycle_task_ids if i in task_map]
        errors.append(
            f"Circular dependency detected involving: {', '.join(cycle_names)}"
        )

    # ── 3. Milestone duration validation ─────────────────────────
    for t in tasks:
        if t.task_type == 'milestone' and (t.duration or 0) != 0:
            errors.append(
                f"Milestone '{t.name}' must have duration = 0 (currently {t.duration})."
            )

    # ── 4. Orphan task warning ───────────────────────────────────
    tasks_with_predecessors = {dep.successor_task_id for dep in dependencies}
    for t in tasks:
        if t.id not in tasks_with_predecessors and t.task_type != 'summary_task':
            warnings.append(
                f"Task '{t.name}' has no predecessors and will start on the project start date."
            )

    # ── 5. Impossible constraint detection ───────────────────────
    # Build a quick predecessor-finish-max map (simplified, calendar-unaware)
    pred_ef_map = {}  # task_id → latest predecessor EF (date), from stored early_finish
    for dep in dependencies:
        s_id = dep.successor_task_id
        p = task_map.get(dep.predecessor_task_id)
        if p and p.early_finish:
            current = pred_ef_map.get(s_id)
            if current is None or p.early_finish > current:
                pred_ef_map[s_id] = p.early_finish

    for t in tasks:
        ctype = t.constraint_type or 'as_soon_as_possible'
        cdate = t.constraint_date

        if cdate is None or ctype == 'as_soon_as_possible':
            continue

        pred_max_ef = pred_ef_map.get(t.id)
        if pred_max_ef is None:
            continue

        if ctype == 'must_start_on' and pred_max_ef > cdate:
            warnings.append(
                f"Constraint on '{t.name}' (Must Start On {cdate}) conflicts with "
                f"predecessor finish ({pred_max_ef}). Constraint may be overridden."
            )
        elif ctype == 'start_no_later_than' and pred_max_ef > cdate:
            warnings.append(
                f"Constraint on '{t.name}' (Start No Later Than {cdate}) conflicts with "
                f"predecessor logic. The task cannot start by {cdate}."
            )
        elif ctype == 'must_finish_on':
            from datetime import timedelta
            # Very rough check: if predecessor EF > must_finish_on - duration
            approx_latest_start = cdate - timedelta(days=t.duration or 0)
            if pred_max_ef > approx_latest_start:
                warnings.append(
                    f"Constraint on '{t.name}' (Must Finish On {cdate}) may be impossible "
                    f"given predecessor finish date ({pred_max_ef})."
                )

    return {'errors': errors, 'warnings': warnings}

"""
scheduling.py — Professional CPM Scheduling Engine
===================================================
Implements the Critical Path Method (CPM) as described in PMBOK:

  Phase 1 — Forward Pass  : compute Early Start (ES) and Early Finish (EF)
  Phase 2 — Backward Pass : compute Late Start (LS) and Late Finish (LF)
  Phase 3 — Float         : Total Float = LS - ES; Free Float = min(succ.ES) - EF
  Phase 4 — Persist       : bulk-update Task rows with computed dates

The engine operates on actual calendar dates, respecting:
  - Project working days (Mon-Fri by default)
  - Project holidays (specific non-working dates)
  - All four dependency types: FS, SS, FF, SF
  - Lag values (positive = delay, negative = lead)
  - Task constraints (ASAP, Must Start On, Start No Earlier Than, etc.)

Entry point: schedule_project(project_id)  — call this after any save.
"""

from collections import defaultdict, deque
from datetime import date, timedelta
import logging

from .workingCalendar import (
    add_working_days,
    subtract_working_days,
    count_working_days,
    advance_to_next_working_day,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _get_calendar(project):
    """
    Extract calendar parameters from a Project instance.
    Returns (working_days, holidays) with safe defaults.
    """
    working_days = project.working_days if project.working_days else [0, 1, 2, 3, 4]
    holidays = project.holidays if project.holidays else []
    return working_days, holidays


def _add(d, n, wd, hol):
    return add_working_days(d, n, wd, hol)


def _sub(d, n, wd, hol):
    return subtract_working_days(d, n, wd, hol)


def _build_graph(tasks, dependencies):
    """
    Build adjacency and reverse-adjacency maps from Dependency rows.

    Returns:
        adj      : {task_id: [(successor_id, dep_type, lag), ...]}
        rev_adj  : {task_id: [(predecessor_id, dep_type, lag), ...]}
        in_degree: {task_id: int}
    """
    task_ids = {t.id for t in tasks}
    adj = defaultdict(list)
    rev_adj = defaultdict(list)
    in_degree = defaultdict(int)

    for t in tasks:
        if t.id not in adj:
            adj[t.id] = []
        if t.id not in rev_adj:
            rev_adj[t.id] = []
        if t.id not in in_degree:
            in_degree[t.id] = 0

    for dep in dependencies:
        pred_id = dep.predecessor_task_id
        succ_id = dep.successor_task_id
        dtype = dep.type
        lag = dep.lag

        if pred_id not in task_ids or succ_id not in task_ids:
            continue  # skip cross-project or orphaned dependencies

        adj[pred_id].append((succ_id, dtype, lag))
        rev_adj[succ_id].append((pred_id, dtype, lag))
        in_degree[succ_id] += 1

    return adj, rev_adj, in_degree


def _topological_sort(task_ids, adj, in_degree):
    """
    Kahn's algorithm for topological sort.
    Returns (order, has_cycle, cycle_node_ids).
    """
    in_deg = dict(in_degree)
    queue = deque([t for t in task_ids if in_deg.get(t, 0) == 0])
    order = []

    while queue:
        u = queue.popleft()
        order.append(u)
        for (v, _, __) in adj.get(u, []):
            in_deg[v] -= 1
            if in_deg[v] == 0:
                queue.append(v)

    has_cycle = len(order) != len(task_ids)
    cycle_ids = {t for t, deg in in_deg.items() if deg > 0} if has_cycle else set()
    return order, has_cycle, cycle_ids


# ─────────────────────────────────────────────────────────────────────────────
# FORWARD PASS
# ─────────────────────────────────────────────────────────────────────────────

def _forward_pass(topo_order, task_map, adj, project_start, wd, hol):
    """
    Compute Early Start (ES) and Early Finish (EF) for every task.

    Rules by dependency type (predecessor p → successor s):
      FS: s.ES = add(p.EF, lag)       [most common]
      SS: s.ES = add(p.ES, lag)
      FF: s.EF = add(p.EF, lag)  → s.ES = sub(s.EF, duration)
      SF: s.EF = add(p.ES, lag)  → s.ES = sub(s.EF, duration)

    If a task has multiple predecessors, take the MAX resulting ES (or EF for
    FF/SF types, which then set ES = EF - duration).

    For summary tasks, ES/EF are set from children in _apply_summary_rollup().
    """
    # Snap project start to next working day
    proj_start = advance_to_next_working_day(project_start, wd, hol)

    es = {}  # task_id → date
    ef = {}  # task_id → date

    for t_id in topo_order:
        task = task_map[t_id]
        duration = task.duration or 0

        predecessors = [info for info in
                        sum([[(dep_pred_id, dtype, lag)
                              for (dep_pred_id, dtype, lag) in []]  # placeholder
                             ], [])]

        # Collect all predecessor-driven constraints on this task's ES/EF
        forced_es_candidates = []
        forced_ef_candidates = []

        # Find predecessors from adj (we need rev_adj perspective)
        # We rebuild rev_adj look-up here from the already-built adj
        # (rev_adj was passed as separate structure; we use task's predecessor_deps)
        pass  # handled below

    return es, ef


def _forward_pass_v2(topo_order, task_map, rev_adj, project_start, wd, hol):
    """
    Full forward pass using rev_adj (predecessor info) for each task.

    rev_adj[t_id] = [(pred_id, dep_type, lag), ...]
    """
    proj_start = advance_to_next_working_day(project_start, wd, hol)

    es = {}
    ef = {}

    for t_id in topo_order:
        task = task_map[t_id]
        duration = task.duration or 0
        preds = rev_adj.get(t_id, [])

        if not preds:
            # No predecessors → task starts at project start
            candidate_es = proj_start
        else:
            # Start with the minimum possible (will be pushed out by each predecessor)
            candidate_es = None
            forced_ef = None  # for FF / SF dependencies

            for (pred_id, dtype, lag) in preds:
                pred_es = es[pred_id]
                pred_ef = ef[pred_id]

                if dtype == 'FS':
                    # Successor starts after predecessor finishes
                    new_es = _add(pred_ef, lag, wd, hol) if lag >= 0 else _sub(pred_ef, abs(lag), wd, hol)
                    candidate_es = max(candidate_es, new_es) if candidate_es else new_es

                elif dtype == 'SS':
                    # Successor starts after predecessor starts
                    new_es = _add(pred_es, lag, wd, hol) if lag >= 0 else _sub(pred_es, abs(lag), wd, hol)
                    candidate_es = max(candidate_es, new_es) if candidate_es else new_es

                elif dtype == 'FF':
                    # Successor finishes after predecessor finishes
                    new_ef = _add(pred_ef, lag, wd, hol) if lag >= 0 else _sub(pred_ef, abs(lag), wd, hol)
                    forced_ef = max(forced_ef, new_ef) if forced_ef else new_ef

                elif dtype == 'SF':
                    # Successor finishes after predecessor starts
                    new_ef = _add(pred_es, lag, wd, hol) if lag >= 0 else _sub(pred_es, abs(lag), wd, hol)
                    forced_ef = max(forced_ef, new_ef) if forced_ef else new_ef

            # Resolve FF/SF forced EF into ES
            if forced_ef is not None:
                implied_es = _sub(forced_ef, duration, wd, hol)
                candidate_es = max(candidate_es, implied_es) if candidate_es else implied_es

            if candidate_es is None:
                candidate_es = proj_start

        # Apply constraint overrides
        constrained_es = _apply_forward_constraint(task, candidate_es, duration, wd, hol)

        es[t_id] = constrained_es
        ef[t_id] = _add(constrained_es, duration, wd, hol)

    return es, ef


def _apply_forward_constraint(task, candidate_es, duration, wd, hol):
    """
    Modify ES based on the task's scheduling constraint.
    Returns the (possibly adjusted) ES.
    """
    ctype = task.constraint_type or 'as_soon_as_possible'
    cdate = task.constraint_date

    if ctype == 'as_soon_as_possible' or cdate is None:
        return candidate_es

    if ctype == 'must_start_on':
        return cdate

    elif ctype == 'start_no_earlier_than':
        return max(candidate_es, cdate)

    elif ctype == 'start_no_later_than':
        # Enforce, but cannot violate predecessor logic — just store as-is;
        # the validator will flag if this conflicts with predecessors.
        return candidate_es

    elif ctype == 'must_finish_on':
        # If the task MUST finish on cdate, work back: ES = cdate - duration
        return _sub(cdate, duration, wd, hol)

    elif ctype == 'finish_no_earlier_than':
        # EF must be >= cdate → ES must be >= cdate - duration
        implied_es = _sub(cdate, duration, wd, hol)
        return max(candidate_es, implied_es)

    elif ctype == 'finish_no_later_than':
        return candidate_es

    return candidate_es


# ─────────────────────────────────────────────────────────────────────────────
# BACKWARD PASS
# ─────────────────────────────────────────────────────────────────────────────

def _backward_pass(topo_order, task_map, adj, es, ef, wd, hol):
    """
    Compute Late Start (LS) and Late Finish (LF) for every task.

    project_lf = max(EF) of all tasks (or a project deadline if set).

    Rules by dependency type (predecessor p, successor s):
      FS: p.LF = min(p.LF, sub(s.LS, lag))
      SS: p.LS = min(p.LS, sub(s.LS, lag))  → p.LF = p.LS + duration
      FF: p.LF = min(p.LF, sub(s.LF, lag))  → p.LS = p.LF - duration
      SF: p.LF = min(p.LF, add(s.LF, abs(lag)))  [rare]
    """
    project_lf = max(ef.values())

    lf = {t_id: project_lf for t_id in task_map}
    ls = {t_id: project_lf for t_id in task_map}

    for t_id in reversed(topo_order):
        task = task_map[t_id]
        duration = task.duration or 0
        succs = adj.get(t_id, [])

        if not succs:
            # Terminal task: LF = project end, LS = LF - duration
            lf[t_id] = project_lf
        else:
            # LF = min of constraints from each successor
            candidate_lf = None

            for (succ_id, dtype, lag) in succs:
                succ_ls = ls[succ_id]
                succ_lf = lf[succ_id]

                if dtype == 'FS':
                    # p.LF = s.LS - lag
                    new_lf = _sub(succ_ls, lag, wd, hol) if lag >= 0 else _add(succ_ls, abs(lag), wd, hol)
                    candidate_lf = min(candidate_lf, new_lf) if candidate_lf else new_lf

                elif dtype == 'SS':
                    # p.LS = s.LS - lag  → p.LF = p.LS + duration
                    new_ls = _sub(succ_ls, lag, wd, hol) if lag >= 0 else _add(succ_ls, abs(lag), wd, hol)
                    implied_lf = _add(new_ls, duration, wd, hol)
                    candidate_lf = min(candidate_lf, implied_lf) if candidate_lf else implied_lf

                elif dtype == 'FF':
                    # p.LF = s.LF - lag
                    new_lf = _sub(succ_lf, lag, wd, hol) if lag >= 0 else _add(succ_lf, abs(lag), wd, hol)
                    candidate_lf = min(candidate_lf, new_lf) if candidate_lf else new_lf

                elif dtype == 'SF':
                    # p.LS = s.LF - lag  → p.LF = p.LS + duration
                    new_ls = _sub(succ_lf, lag, wd, hol) if lag >= 0 else _add(succ_lf, abs(lag), wd, hol)
                    implied_lf = _add(new_ls, duration, wd, hol)
                    candidate_lf = min(candidate_lf, implied_lf) if candidate_lf else implied_lf

            if candidate_lf is not None:
                lf[t_id] = candidate_lf

        ls[t_id] = _sub(lf[t_id], duration, wd, hol)

    return ls, lf


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY TASK ROLLUP
# ─────────────────────────────────────────────────────────────────────────────

def _apply_summary_rollup(task_map, es, ef, wd, hol):
    """
    For summary (parent) tasks: override ES/EF from children.
      summary.ES = min(child.ES)
      summary.EF = max(child.EF)
      summary.duration = count_working_days(ES, EF)
    """
    # Build parent → children map
    children_map = defaultdict(list)
    for t in task_map.values():
        if t.parent_task_id and t.parent_task_id in task_map:
            children_map[t.parent_task_id].append(t.id)

    # Process parents from deepest level up
    # Simple approach: iterate until stable (handles multi-level hierarchies)
    for _ in range(10):  # max 10 nesting levels
        changed = False
        for parent_id, child_ids in children_map.items():
            if not child_ids:
                continue
            valid_children = [c for c in child_ids if c in es]
            if not valid_children:
                continue

            parent_es = min(es[c] for c in valid_children)
            parent_ef = max(ef[c] for c in valid_children)

            if es.get(parent_id) != parent_es or ef.get(parent_id) != parent_ef:
                es[parent_id] = parent_es
                ef[parent_id] = parent_ef
                # Update duration field on the in-memory task object
                task_map[parent_id].duration = count_working_days(parent_es, parent_ef, wd, hol)
                changed = True
        if not changed:
            break

    return es, ef


# ─────────────────────────────────────────────────────────────────────────────
# FLOAT CALCULATION
# ─────────────────────────────────────────────────────────────────────────────

def _calculate_floats(topo_order, task_map, adj, es, ef, ls, lf, wd, hol):
    """
    total_float[t] = (ls[t] - es[t]) in working days
    free_float[t]  = min(succ.ES) - ef[t]  (for FS deps; simplification for others)
    isCritical = total_float == 0
    """
    total_float = {}
    free_float = {}
    is_critical = {}

    for t_id in task_map:
        tf = count_working_days(es[t_id], ls[t_id], wd, hol)
        total_float[t_id] = tf
        is_critical[t_id] = (tf == 0)

    for t_id in task_map:
        succs = adj.get(t_id, [])
        if not succs:
            free_float[t_id] = 0
        else:
            # Free float = min(successor ES) - this task's EF (in working days)
            min_succ_es = min(es[succ_id] for (succ_id, _, __) in succs)
            ff = count_working_days(ef[t_id], min_succ_es, wd, hol)
            free_float[t_id] = max(0, ff)

    return total_float, free_float, is_critical


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def schedule_project(project_id):
    """
    Full CPM recalculation for a project.

    1. Loads Project, Tasks, and Dependency rows
    2. Runs forward/backward pass with working calendar
    3. Computes floats, critical path flags
    4. Bulk-updates Task rows (early_start, early_finish, late_start,
       late_finish, total_float, free_float, is_critical, start_date, duration)

    Returns a dict keyed by task_id with all computed metrics.
    """
    # Import here to avoid circular at module level
    from pm.models import Task, Dependency
    from projects.models import Project

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        logger.warning(f"schedule_project: project {project_id} not found")
        return {}

    tasks = list(Task.objects.filter(project_id=project_id).prefetch_related())
    if not tasks:
        return {}

    dependencies = list(Dependency.objects.filter(project_id=project_id))

    wd, hol = _get_calendar(project)
    project_start = project.start_date

    task_map = {t.id: t for t in tasks}
    adj, rev_adj, in_degree = _build_graph(tasks, dependencies)

    # ── Topological Sort ─────────────────────────────────────────
    topo_order, has_cycle, cycle_ids = _topological_sort(
        list(task_map.keys()), adj, in_degree)

    if has_cycle:
        cycle_names = [task_map[i].name for i in cycle_ids if i in task_map]
        logger.error(f"Circular dependency detected: {cycle_names}")
        return {'_error': f"Circular dependency: {', '.join(cycle_names)}"}

    # ── Forward Pass ─────────────────────────────────────────────
    es, ef = _forward_pass_v2(topo_order, task_map, rev_adj, project_start, wd, hol)

    # ── Summary Task Rollup ──────────────────────────────────────
    es, ef = _apply_summary_rollup(task_map, es, ef, wd, hol)

    # ── Backward Pass ────────────────────────────────────────────
    ls, lf = _backward_pass(topo_order, task_map, adj, es, ef, wd, hol)

    # ── Float & Criticality ──────────────────────────────────────
    total_float, free_float, is_critical = _calculate_floats(
        topo_order, task_map, adj, es, ef, ls, lf, wd, hol)

    # ── Persist to Database ──────────────────────────────────────
    updates = []
    for t in tasks:
        t_id = t.id
        if t_id not in es:
            continue

        t.early_start = es[t_id]
        t.early_finish = ef[t_id]
        t.late_start = ls[t_id]
        t.late_finish = lf[t_id]
        t.total_float = total_float.get(t_id, 0)
        t.free_float = free_float.get(t_id, 0)
        t.is_critical = is_critical.get(t_id, False)

        # Keep start_date in sync with early_start for backward compat
        t.start_date = es[t_id]

        # Auto-set priority for critical tasks
        if t.is_critical and t.priority not in ('critical',):
            t.priority = 'critical'
        elif not t.is_critical and t.priority == 'critical':
            t.priority = 'high'

        updates.append(t)

    if updates:
        Task.objects.bulk_update(updates, [
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'total_float', 'free_float', 'is_critical',
            'start_date', 'duration', 'priority',
        ])

    # Build return dict
    results = {}
    for t_id in task_map:
        if t_id not in es:
            continue
        results[t_id] = {
            'es': es[t_id].isoformat() if es.get(t_id) else None,
            'ef': ef[t_id].isoformat() if ef.get(t_id) else None,
            'ls': ls[t_id].isoformat() if ls.get(t_id) else None,
            'lf': lf[t_id].isoformat() if lf.get(t_id) else None,
            'total_float': total_float.get(t_id, 0),
            'free_float': free_float.get(t_id, 0),
            'is_critical': is_critical.get(t_id, False),
            'slack': total_float.get(t_id, 0),  # alias for backward compat
        }

    return results


# ─────────────────────────────────────────────────────────────────────────────
# BACKWARD-COMPATIBLE WRAPPERS (keep existing callers working)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_cpm(tasks):
    """
    Legacy wrapper: accepts a tasks queryset, delegates to schedule_project.
    Returns the same dict shape as the old implementation for backward compat.
    """
    if not tasks:
        return {}
    # Get project_id from any task
    task_list = list(tasks)
    if not task_list:
        return {}
    project_id = task_list[0].project_id
    return schedule_project(project_id)


def auto_schedule_tasks(tasks):
    """
    Legacy wrapper: triggers a full CPM recalculation.
    Returns (success: bool, message: str).
    """
    if not tasks:
        return True, "No tasks to schedule"

    task_list = list(tasks)
    if not task_list:
        return True, "No tasks to schedule"

    project_id = task_list[0].project_id
    result = schedule_project(project_id)

    if isinstance(result, dict) and '_error' in result:
        return False, result['_error']
    return True, "Scheduled successfully"

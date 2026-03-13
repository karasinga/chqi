from collections import defaultdict, deque
from datetime import timedelta

def auto_schedule_tasks(tasks):
    """
    Updates the start_date of tasks based on their dependencies.
    tasks: QuerySet of Task objects.
    Returns: (success, message)
    """
    if not tasks:
        return True, "No tasks to schedule"

    # Build graph
    adj = defaultdict(list)
    in_degree = defaultdict(int)
    task_map = {t.id: t for t in tasks}
    
    for t in tasks:
        if t.id not in adj: adj[t.id] = []
        if t.id not in in_degree: in_degree[t.id] = 0
            
        for dep in t.dependencies.all():
            # Only consider dependencies that are in the current set of tasks
            # External dependencies are treated as static constraints (handled in date calc)
            if dep.id not in task_map:
                continue

            # dep -> t
            adj[dep.id].append(t.id)
            in_degree[t.id] += 1

    # Topological Sort
    queue = deque([t.id for t in tasks if in_degree[t.id] == 0])
    topo_order = []
    
    while queue:
        u = queue.popleft()
        topo_order.append(u)
        
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
                
    if len(topo_order) != len(tasks):
        # Cycle detected
        remaining = [task_map[t_id].name for t_id, deg in in_degree.items() if deg > 0]
        return False, f"Cycle detected involving: {', '.join(remaining[:5])}"

    # Calculate Dates
    updates = []
    for t_id in topo_order:
        task = task_map[t_id]
        dependencies = task.dependencies.all()
        
        if dependencies:
            max_end_date = None
            for dep in dependencies:
                # Use the updated object from task_map if available, otherwise use the dep object directly
                dep_obj = task_map.get(dep.id, dep)
                
                dep_end = dep_obj.start_date + timedelta(days=dep_obj.duration)
                
                if max_end_date is None or dep_end > max_end_date:
                    max_end_date = dep_end
            
            if max_end_date and task.start_date != max_end_date:
                task.start_date = max_end_date
                updates.append(task)
    
    if updates:
        from pm.models import Task
        Task.objects.bulk_update(updates, ['start_date'])
        
    return True, "Scheduled successfully"

def calculate_cpm(tasks):
    """
    Calculates CPM metrics: ES, EF, LS, LF, Slack, IsCritical.
    Returns a dict keyed by task ID.
    """
    if not tasks:
        return {}

    # 1. Build Graph & Maps
    adj = defaultdict(list)
    rev_adj = defaultdict(list)
    in_degree = defaultdict(int)
    task_map = {t.id: t for t in tasks}
    
    for t in tasks:
        if t.id not in adj: adj[t.id] = []
        if t.id not in rev_adj: rev_adj[t.id] = []
        if t.id not in in_degree: in_degree[t.id] = 0
            
        for dep in t.dependencies.all():
            if dep.id not in task_map: continue
            adj[dep.id].append(t.id)
            rev_adj[t.id].append(dep.id)
            in_degree[t.id] += 1

    # 2. Topological Sort (Forward Pass)
    queue = deque([t.id for t in tasks if in_degree[t.id] == 0])
    topo_order = []
    
    while queue:
        u = queue.popleft()
        topo_order.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
                
    if len(topo_order) != len(tasks):
        return {} # Cycle detected

    # 3. Forward Pass (ES, EF)
    # ES = Max(EF of predecessors). Start = 0 relative to project start.
    # We will use relative days for calculation simplicity.
    
    es = {t_id: 0 for t_id in task_map}
    ef = {t_id: 0 for t_id in task_map}
    
    project_start_date = min([t.start_date for t in tasks]) if tasks else None

    for u in topo_order:
        duration = task_map[u].duration
        # ES is already 0 or max of predecessors
        ef[u] = es[u] + duration
        
        for v in adj[u]:
            if ef[u] > es[v]:
                es[v] = ef[u]

    project_duration = max(ef.values()) if ef else 0

    # 4. Backward Pass (LS, LF)
    # LF = Min(LS of successors). For end nodes, LF = Project Duration.
    
    lf = {t_id: project_duration for t_id in task_map}
    ls = {t_id: project_duration for t_id in task_map}
    
    for u in reversed(topo_order):
        duration = task_map[u].duration
        ls[u] = lf[u] - duration
        
        for v in rev_adj[u]:
            if ls[u] < lf[v]:
                lf[v] = ls[u]

    # 5. Calculate Slack & Criticality
    results = {}
    for t_id in task_map:
        slack = ls[t_id] - es[t_id]
        is_critical = (slack == 0)
        results[t_id] = {
            "es": es[t_id],
            "ef": ef[t_id],
            "ls": ls[t_id],
            "lf": lf[t_id],
            "slack": slack,
            "is_critical": is_critical
        }
        
    return results

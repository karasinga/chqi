# Extractor Patch — `--skip-upsert` cloud mode

**Repo:** `khis-extractor` (separate from this dashboard repo)
**Branch suggestion:** `feature/skip-consolidation-cloud`

## Problem

`run_all_moh.py` calls `_consolidate_to_master()` **unconditionally** after a
successful batch. That function:
1. Merges the new timestamped CSV into a stable master file under
   `POWERBI_ROOT` (a hard-coded Windows laptop path).
2. **Deletes the timestamped source CSV** (`new_csv.unlink()`).

`--skip-upsert` only gates the *external* Power BI upsert call, not
consolidation. In the GitHub Actions cloud run:
- The Windows `POWERBI_ROOT` path is meaningless → write goes to a garbage
  relative path.
- The timestamped CSV (the one the dashboard's `load_dmh_csvs` needs) is
  deleted before the loader ever sees it.
- Net: profiles with a `master_filename` (`moh_717`, `moh_515`) silently
  vanish from the DB load. No error logged.

`run_all_reporting.py` is unaffected — it has no consolidation step.

## Fix

Gate the consolidation call behind `--skip-upsert` so that flag means a true
"cloud mode": keep timestamped CSVs intact, skip all local-master writes.

### File: `run_all_moh.py`

**Before** (around the `for r in successes:` loop, post-batch):

```python
    # Consolidate timestamped CSVs into stable master files, or collect for upsert
    upsert_csvs: list[Path] = []
    for r in successes:
        for csv_path in r.csv_paths:
            profile_cfg = next(
                (p for p in MOH_PROFILES if p["profile"] == r.label), None
            )
            master_fn = profile_cfg.get("master_filename") if profile_cfg else None

            if master_fn:
                try:
                    _consolidate_to_master(csv_path, master_fn)
                except Exception as exc:
                    log.error("Consolidation failed for %s: %s", csv_path.name, exc)
                    upsert_csvs.append(csv_path)
            else:
                upsert_csvs.append(csv_path)

    if not skip_upsert:
        _run_upsert(upsert_csvs)
```

**After:**

```python
    # In cloud mode (--skip-upsert), keep all timestamped CSVs intact for the
    # downstream DB loader. Only consolidate into local master files when we're
    # actually running the laptop-based Power BI update too.
    upsert_csvs: list[Path] = []
    for r in successes:
        for csv_path in r.csv_paths:
            profile_cfg = next(
                (p for p in MOH_PROFILES if p["profile"] == r.label), None
            )
            master_fn = profile_cfg.get("master_filename") if profile_cfg else None

            if master_fn and not skip_upsert:
                try:
                    _consolidate_to_master(csv_path, master_fn)
                except Exception as exc:
                    log.error("Consolidation failed for %s: %s", csv_path.name, exc)
                    upsert_csvs.append(csv_path)
            else:
                # No master mapping, or cloud mode: preserve the timestamped CSV.
                upsert_csvs.append(csv_path)

    if not skip_upsert:
        _run_upsert(upsert_csvs)
```

The only change is `if master_fn:` → `if master_fn and not skip_upsert:`.
With `--skip-upsert` set, every timestamped CSV lands in `upsert_csvs`, which
is then ignored (the `if not skip_upsert:` guard already prevents the external
upsert). Result: timestamped CSVs survive untouched in `outputs/`.

## Apply

```bash
cd <extractor repo>
git checkout -b feature/skip-consolidation-cloud
# edit run_all_moh.py per above
git add run_all_moh.py
git commit -m "fix: gate master-file consolidation behind --skip-upsert for cloud runs"
git push -u origin feature/skip-consolidation-cloud
# merge to main (or whatever branch the dashboard workflow checks out)
```

Until this lands on the branch the GitHub Actions workflow checks out, the
scheduled run will silently drop `moh_717` and `moh_515` analytics data.

# DMH History — KHIS → Postgres → PowerBI Fabric

App: `dmh_dashboard` (Division of Mental Health).

## Goal
Automate KHIS data refresh twice monthly (18th, 28th). Replace local CSV masters
with Postgres as permanent store. PowerBI Fabric reads DB directly — no laptop,
no manual refresh/publish.

## Architecture

```
GitHub Actions (cron 18th & 28th, 06:00 UTC)
  → checkout khis-extractor repo (PAT)
  → run run_all_moh.py --skip-upsert  (cloud mode: keeps timestamped CSVs)
  → run run_all_reporting.py --skip-upsert
  → checkout dashboard repo
  → pip install -r backend/requirements.txt
  → python manage.py load_dmh_csvs --dir ../outputs
        ↓
   Postgres (dmh_dashboard tables)  ← permanent store, grows monthly
        ↓
PowerBI Fabric (scheduled refresh, DirectQuery/Import)
  → reads Postgres tables directly
```

## Data flow semantics

- Upsert, not replace. Match key: `(org_unit_id, period_id, data_element,
  name, profile)` for analytics; `+ metric` for reporting.
- `as_of_date` NOT in conflict key → latest-state semantics.
- Extractor pulls last N months (N=3 currently). Only those months upserted.
  Older months untouched. Grace period change = change extractor's
  `default_period_range` `n` param. Dashboard is grace-agnostic.

## Two load modes

1. **Incremental** (scheduled): `load_dmh_csvs --dir outputs/`
   Discovers newest timestamped CSV per profile per type.
2. **Backfill** (one-time): `load_dmh_csvs --master-dir "...\JnJ\KHIS data sets"`
   Loads historical master CSVs via MASTER_PROFILE_MAP.

## Files

| Path | Purpose |
|------|---------|
| `backend/dmh_dashboard/models.py` | 3 models: DmhRefreshLog, DmhAnalyticsFact, DmhReportingFact |
| `backend/dmh_dashboard/admin.py` | Read-only fact tables, refresh log editable |
| `backend/dmh_dashboard/loaders.py` | ORM bulk_create(update_conflicts=True), NaN-safe |
| `backend/dmh_dashboard/management/commands/load_dmh_csvs.py` | Loader command |
| `.github/workflows/dmh-extract-load.yml` | Cron workflow |
| `dmh_history/EXTRACTOR_PATCH.md` | Diff to gate consolidation behind --skip-upsert |

## Bugs fixed from review iterations

1. App import: `dmh_dashboard.*` not `khis_history.*`
2. Master glob: `**` recursive (master CSVs are subfoldered)
3. Master profile inference: `MASTER_PROFILE_MAP` (substring match fails on
   human-readable names like "MOH 717 Inpatient")
4. `timezone` imported in command
5. `dtype={'Value': str}` at read — no `str(float)` fidelity loss
6. Glob case-insensitive (Linux runner vs Windows dev)
7. `_consolidate_to_master` gated behind `--skip-upsert` in extractor
   (else 717/515 timestamped CSVs deleted before DB load)
8. Unified ORM path — no psycopg2 raw SQL, works SQLite + Postgres
9. **Perf:** `to_dict('records')` vectorized instead of `iterrows()`
   (~50x faster). `transaction.atomic()` per file (kills autocommit sync storm).
10. **NOT NULL:** CharField columns coerced `None → ''` (blank-quarter rows
    in morbidity CSV tripped NOT NULL constraint when None passed explicitly)

## Verified locally (SQLite)

- `makemigrations` / `migrate` / `check`: clean, 0 issues.
- Backfill morbidity analytics: 60380 rows. Re-run: same count, 0 dupes.
- Backfill moh_647 reporting: 431450 rows. Re-run: same count, 0 dupes.
- NaN → blank-quarter stored as `''` (not `"nan"`); Value `100.0` preserved
  as text. Real county/facility/metric data intact.
- Full backfill (all profiles) exceeds SQLite dev perf budget (~1.8M rows);
  Postgres prod expected 5-10x faster for bulk. Correctness proven on subset.

## Verification

```bash
# Local, SQLite
python manage.py makemigrations dmh_dashboard
python manage.py migrate
python manage.py load_dmh_csvs --dir <local outputs dir>
python manage.py load_dmh_csvs --master-dir "C:\Users\Admin\Documents\CHQI\JnJ\KHIS data sets"
# Run twice → row count stable, as_of_date updated

# Cloud
# Trigger GH Action via workflow_dispatch → check Postgres rows

# PowerBI
# Dataset → Get Data → PostgreSQL → map DmhAnalyticsFact / DmhReportingFact
# Set scheduled refresh
```

## Open items (user)

- Set GH secrets: `KHIS_USERNAME`, `KHIS_PASSWORD`, `KHIS_REPO_PAT`, `DATABASE_URL`
- Confirm extractor repo slug for workflow `repository:` field
- PowerBI Fabric: public IP allowlist for Postgres, or On-Prem Gateway if needed

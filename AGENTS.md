# AGENTS.md: Developer & AI Agent Guide

Welcome to the **GitHub Actions Cron Delay Tracker** repository. This document provides architectural context, operational procedures, data models, and guidelines for AI agents and human developers collaborating on this project.

---

## 1. Project Overview & Objective

### The Problem
GitHub Actions cron triggers are scheduled best-effort. Depending on overall GitHub platform workload and runner queue depths, a workflow scheduled for `03:14 UTC` may actually execute at `03:17 UTC`, `03:22 UTC`, or later.

### The Solution
This project tracks and analyzes scheduler jitter over time:
1. **Automated Cron Trigger**: A daily GitHub Actions workflow triggers at `14 3 * * *` (03:14 UTC).
2. **Measurement & Storage**: A Python script determines the actual runner startup time, calculates the delay in seconds and minutes, and appends the record to an in-repository **SQLite database** (`data/delays.db`).
3. **Data Snapshots**: Data is exported to JSON (`data/delays.json` and `frontend/src/data/delays.json`) and committed back to git.
4. **Vite Visualization**: A modern Vite + React + TypeScript + Tailwind CSS dashboard visualizes:
   - Daily delay times for the **last week** (individual horizontal bars).
   - Average delay for the **last month** (with weekly cohort horizontal bars).
   - Average delay across the **last years** (annual comparative horizontal bars).
   - Interactive KPI cards and searchable run history.

---

## 2. Directory Structure

```
Start/
├── .github/
│   └── workflows/
│       └── cron-delay-monitor.yml   # 03:14 UTC cron + manual dispatch + commit DB + deploy Pages
├── data/
│   ├── delays.db                    # In-repo SQLite database (committed to git)
│   └── delays.json                  # Exported data snapshot and summary metrics
├── scripts/
│   ├── record_delay.py              # CLI to compute delays, update SQLite, export JSON
│   └── test_tracker.py              # Unit tests for tracker and aggregations
├── frontend/                        # Vite + React + TypeScript + Tailwind CSS application
│   ├── src/
│   │   ├── components/
│   │   │   ├── HorizontalBarChart.tsx # Reusable horizontal bar chart with threshold colors
│   │   │   ├── MetricCards.tsx        # KPI cards (latest, week avg, month avg, multi-year)
│   │   │   └── DelayTable.tsx         # Chronological execution log table with search
│   │   ├── data/
│   │   │   └── delays.json          # Fallback bundled dataset snapshot
│   │   ├── utils/
│   │   │   └── stats.ts             # Aggregations, duration formatters, cohort builders
│   │   ├── types.ts                 # Data models and interfaces
│   │   ├── App.tsx                  # Main dashboard layout and tab views
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Tailwind styling
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies and scripts
│   ├── tsconfig.json                # TypeScript compiler configuration
│   └── vite.config.ts               # Vite configuration (base: './')
├── package.json                     # Root orchestrator scripts (dev, build, test, record)
├── AGENTS.md                        # This developer & AI guide
├── CHANGELOG.md                     # Semantic project history
├── README.md                        # User documentation
└── .gitignore                       # Git ignore rules
```

---

## 3. Database Schema & Data Engine

### SQLite Database (`data/delays.db`)
Database engine: Standard Python `sqlite3` (zero third-party dependencies).

```sql
CREATE TABLE IF NOT EXISTS delays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduled_time TEXT NOT NULL,       -- Target trigger time in ISO8601 UTC (e.g. 2026-09-08T03:14:00+00:00)
    actual_time TEXT NOT NULL,          -- Real runner start timestamp in ISO8601 UTC
    delay_seconds REAL NOT NULL,        -- Computed delay in seconds: max(0, actual - scheduled)
    delay_minutes REAL NOT NULL,        -- Delay in minutes rounded to 2 decimal places
    trigger_type TEXT NOT NULL,         -- 'cron' | 'workflow_dispatch' | 'manual'
    github_run_id TEXT,                 -- GitHub Actions Run ID (e.g. 102938475)
    github_run_number INTEGER,          -- Sequential run number in GitHub
    notes TEXT,                         -- Informational context or tags
    created_at TEXT NOT NULL            -- Record creation timestamp
);

CREATE INDEX IF NOT EXISTS idx_actual_time ON delays(actual_time);
```

### JSON Export Format (`data/delays.json`)
The script exports aggregated metrics along with raw runs for easy frontend rendering:
```json
{
  "generated_at": "2026-09-08T06:18:09.507656+00:00",
  "summary": {
    "total_runs": 1096,
    "all_time_avg_minutes": 5.64,
    "last_week_avg_minutes": 4.28,
    "last_month_avg_minutes": 3.80,
    "yearly_averages": [
      { "year": 2024, "avg_delay_minutes": 6.08, "run_count": 366 },
      { "year": 2025, "avg_delay_minutes": 5.50, "run_count": 365 },
      { "year": 2026, "avg_delay_minutes": 4.71, "run_count": 251 }
    ],
    "last_week_runs": [...],
    "latest_run": {...}
  },
  "runs": [...]
}
```

---

## 4. Key CLI Commands

From repository root:

| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server for local UI preview |
| `npm run build` | Type-check and compile Vite production build to `frontend/dist/` |
| `npm test` | Run Python unit tests for calculation and database engine |
| `npm run record` | Record a new run for today against 03:14 UTC |
| `npm run record:seed` | Seed or re-seed realistic 3-year historical data |
| `npm run record:export` | Refresh JSON exports without recording a new run |

### Direct Python Script Options (`scripts/record_delay.py`):
```bash
python3 scripts/record_delay.py --help
  --db PATH                 Custom SQLite path
  --seed                    Generate historical data for the past 3 years
  --scheduled-time ISO      Explicit scheduled timestamp override
  --actual-time ISO         Explicit actual timestamp override
  --delay-seconds SEC       Direct delay in seconds override
  --trigger-type TYPE       Event type (cron, workflow_dispatch, manual)
  --run-id ID               GitHub Actions run ID
  --run-number NUM          GitHub Actions run number
  --export-only             Export JSON without inserting a new record
```

---

## 5. GitHub Actions Workflow Mechanics

File: `.github/workflows/cron-delay-monitor.yml`

1. **Schedule**: `cron: '14 3 * * *'` executes daily at 3:14 AM UTC.
2. **Permissions**:
   - `contents: write`: Allows runner to commit updated SQLite database back to branch.
   - `pages: write` & `id-token: write`: Allows GitHub Pages deployment.
3. **Commit Step**:
   - Updates `data/delays.db` and JSON files.
   - Uses `[skip ci]` in commit message to prevent recursive workflow triggers.
4. **Deploy Step**:
   - Builds Vite frontend with base `./` so it functions on custom domains and project subpaths (e.g. `https://<user>.github.io/<repo>/`).
   - Uses official `actions/upload-pages-artifact` and `actions/deploy-pages`.

---

## 6. Frontend Visualization Conventions

- **Visual Element**: **Horizontal Bar Graph** (`HorizontalBarChart.tsx`).
  - Bar widths scale proportionally relative to maximum value in active view.
  - An average indicator dashed line provides immediate benchmark context.
  - Interactive hover state displays detailed scheduled time, start time, and delta.
- **Latency Thresholds**:
  - `≤ 3.0 min`: Emerald (Optimal / very fast queue)
  - `3.1 - 7.0 min`: Indigo / Blue (Standard GitHub queue wait)
  - `7.1 - 12.0 min`: Amber (Moderate congestion)
  - `> 12.0 min`: Rose / Red (High queue delay)

---

## 7. Guidelines for AI Agents Modifying This Codebase

1. **Database Integrity**: Never delete or corrupt existing historical rows in `data/delays.db`. Always use migrations or alter statements if modifying table schema.
2. **Deterministic Time Handling**: Always use UTC (`datetime.now(timezone.utc)` and `toISOString()`). Never compare local time against UTC timestamps.
3. **Dual Export**: When modifying `scripts/record_delay.py`, ensure data is exported to both `data/delays.json` and `frontend/src/data/delays.json` (and `frontend/public/data/delays.json`) so the static build and dynamic fetch remain synchronized.
4. **Testing**: Run `npm test` before committing any changes to `scripts/`.
5. **Vite Base Path**: Ensure `base: './'` remains in `frontend/vite.config.ts` to prevent asset 404 errors on GitHub Pages.

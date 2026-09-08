# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-08

### Added
- **Cron Delay Tracking Engine (`scripts/record_delay.py`)**:
  - Automatically calculates startup delay against the scheduled 03:14 UTC daily cron trigger.
  - Stores all historical runs in an in-repository SQLite database (`data/delays.db`).
  - Supports manual triggers and explicit delay overrides for verification.
  - Historical data generator (`--seed`) pre-populates realistic data spanning 3 years.
  - Exports aggregated JSON snapshots to `data/delays.json` and frontend assets.
- **Automated Unit Tests (`scripts/test_tracker.py`)**:
  - Tests covering UTC timestamp calculation, GitHub queue latency simulations, SQLite table initialization, record insertion, and JSON metric export.
- **Vite Web Dashboard (`frontend/`)**:
  - Built with Vite, React 18, TypeScript, and Tailwind CSS.
  - **Horizontal Bar Graph Visualization**:
    - Daily startup delay times for the last week.
    - Average startup delay for the last month with weekly breakdown cohorts.
    - Multi-year comparison comparing average startup delays across past years (2024, 2025, 2026).
  - Summary KPI cards for latest run, weekly average, monthly average, and all-time statistics.
  - Searchable and filterable execution history table with run IDs and trigger types.
- **GitHub Actions Workflow (`.github/workflows/cron-delay-monitor.yml`)**:
  - Scheduled daily at `14 3 * * *` (03:14 UTC).
  - Automatic `[skip ci]` commit and push of updated SQLite database and JSON.
  - Automated build and deployment to GitHub Pages via `actions/deploy-pages@v4`.
- **Developer & Agent Documentation**:
  - `AGENTS.md`: Full architectural context, data schemas, CLI workflows, and extension guidelines for AI assistants and engineers.
  - `README.md`: Comprehensive project overview, badges, local setup, and usage instructions.
  - Root `package.json` with unified scripts (`npm run dev`, `npm run build`, `npm test`, `npm run record`).

### Changed
- Converted repository from a starter Jekyll template into a modern, full-stack automated analytics repository.
- Configured `.gitignore` to track SQLite database while cleanly excluding Node build artifacts and modules.

### Removed
- Legacy Jekyll workflow `.github/workflows/build-and-deploy.yml` and deprecated `Gemfile`.

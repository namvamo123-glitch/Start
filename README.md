# GitHub Actions Cron Delay Tracker ⏱️📊

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Cron: 03:14 UTC](https://img.shields.io/badge/Cron-03%3A14%20UTC-indigo.svg)](https://github.com/)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite%203-lightgrey.svg)](https://sqlite.org/)
[![UI: Vite + React](https://img.shields.io/badge/Dashboard-Vite%20%2B%20React-purple.svg)](https://vitejs.dev/)

An automated system that measures, records, and visualizes GitHub Actions cron runner startup delay over time.

---

## 🎯 Overview

Each morning at **03:14 AM UTC**, a GitHub Actions cron job triggers a script that:
1. Calculates the actual time the runner started relative to the scheduled `03:14:00 UTC` target.
2. Appends the run metrics into an in-repo **SQLite database** (`data/delays.db`).
3. Exports aggregated snapshot data to JSON (`data/delays.json`).
4. Automatically commits the updated database and data snapshot back to the repository.
5. Builds and deploys an interactive **Vite web dashboard** to GitHub Pages with **horizontal bar graphs** displaying:
   - **Daily startup delays for the last week**
   - **Average startup delay for the last month** (with weekly cohort breakdowns)
   - **Average startup delay of the last years** (annual comparative trends)
   - Searchable execution history table and KPI metric cards

---

## 🏗️ Architecture

```
Start/
├── .github/workflows/
│   └── cron-delay-monitor.yml   # 03:14 UTC cron + commit DB + deploy Vite
├── data/
│   ├── delays.db                # In-repo SQLite database (committed to repo)
│   └── delays.json              # Aggregated JSON snapshot for static site & API
├── scripts/
│   ├── record_delay.py          # Delay calculation, SQLite logger & JSON exporter
│   └── test_tracker.py          # Unit tests for calculation & database operations
├── frontend/                    # Vite + React + TypeScript + Tailwind CSS web dashboard
│   ├── src/
│   │   ├── components/          # Horizontal bar charts, metric cards, table
│   │   ├── types.ts             # TypeScript definitions
│   │   └── App.tsx              # Main dashboard
│   └── vite.config.ts           # Vite build config
├── AGENTS.md                    # Guidelines for AI coding agents & future development
├── CHANGELOG.md                 # Semantic version history
└── package.json                 # Unified repository scripts
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Python 3.10+** (uses standard library `sqlite3` and `unittest`)
- **Node.js 18+** and **npm**

### 1. Install & Test
```bash
# Run unit tests
npm test

# Verify or seed historical SQLite database
npm run record:seed
```

### 2. Start Local Vite Dashboard
```bash
# Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5173/` to view the horizontal bar charts and live metrics.

### 3. Build for Production
```bash
npm run build
```
Generates static assets in `frontend/dist/`.

---

## 📊 Visualizations

The dashboard is built around responsive **horizontal bar graphs**:

- **Last Week View**: Individual bars for each day displaying runner latency in minutes and seconds, color-coded by queue health:
  - 🟢 **Fast / Optimal**: `< 3 min`
  - 🔵 **Normal Queue**: `3 – 7 min`
  - 🟡 **Queue Congestion**: `7 – 12 min`
  - 🔴 **High Delay**: `> 12 min`
- **Last Month Average**: Compares the 30-day average against 4 weekly cohorts.
- **Multi-Year Comparison**: Compares average queue latency across years (e.g., 2024, 2025, 2026).
- **Recent Execution History**: Searchable table with scheduled time, actual start, delay, and GitHub run IDs.

---

## ⚙️ GitHub Actions Automation

The workflow `.github/workflows/cron-delay-monitor.yml`:
- Triggers on schedule: `14 3 * * *` (Daily at 03:14 UTC).
- Supports manual execution via `workflow_dispatch` with optional simulated delay inputs.
- Automatically commits updated `data/delays.db` back to `main` with `[skip ci]`.
- Deploys the Vite dashboard to GitHub Pages automatically.

> **GitHub Repository Setup**:
> Ensure that GitHub Actions has write permissions:
> **Settings → Actions → General → Workflow permissions → Read and write permissions**.

---

## 🤖 AI Agent Instructions

If you are developing this repository with an AI coding assistant, see [AGENTS.md](AGENTS.md) for data schemas, architectural rules, and guidelines.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

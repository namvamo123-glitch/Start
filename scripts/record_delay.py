#!/usr/bin/env python3
"""
Record GitHub Actions cron startup delays into an in-repo SQLite database.
Computes delay relative to the scheduled 03:14:00 UTC trigger time.
Exports database snapshots to JSON for the Vite dashboard.
"""

import argparse
import json
import os
import random
import sqlite3
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

# Paths relative to repo root
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = REPO_ROOT / "data" / "delays.db"
DEFAULT_JSON_PATHS = [
    REPO_ROOT / "data" / "delays.json",
    REPO_ROOT / "frontend" / "src" / "data" / "delays.json",
    REPO_ROOT / "frontend" / "public" / "data" / "delays.json",
]

TARGET_HOUR = 3
TARGET_MINUTE = 14


def get_db_connection(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS delays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scheduled_time TEXT NOT NULL,
                actual_time TEXT NOT NULL,
                delay_seconds REAL NOT NULL,
                delay_minutes REAL NOT NULL,
                trigger_type TEXT NOT NULL,
                github_run_id TEXT,
                github_run_number INTEGER,
                notes TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_actual_time ON delays(actual_time);"
        )


def calculate_delay(
    actual_dt: datetime,
    target_hour: int = TARGET_HOUR,
    target_minute: int = TARGET_MINUTE,
    scheduled_iso: str | None = None,
    explicit_delay_seconds: float | None = None,
) -> tuple[datetime, float, float]:
    """
    Calculate scheduled datetime, delay in seconds and minutes.
    Assumes scheduled time was 03:14 UTC on the same day as actual_dt,
    or preceding day if actual_dt is earlier than 03:14 UTC.
    """
    if scheduled_iso:
        scheduled_dt = datetime.fromisoformat(scheduled_iso)
        if scheduled_dt.tzinfo is None:
            scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
    else:
        target_today = datetime.combine(
            actual_dt.date(), time(target_hour, target_minute, 0, tzinfo=timezone.utc)
        )
        if (actual_dt - target_today).total_seconds() < -3600:
            target_today -= timedelta(days=1)
        scheduled_dt = target_today

    if explicit_delay_seconds is not None:
        delay_seconds = max(0.0, float(explicit_delay_seconds))
    else:
        delay_seconds = max(0.0, (actual_dt - scheduled_dt).total_seconds())

    delay_minutes = round(delay_seconds / 60.0, 2)
    return scheduled_dt, delay_seconds, delay_minutes


def record_run(
    conn: sqlite3.Connection,
    actual_dt: datetime | None = None,
    scheduled_iso: str | None = None,
    delay_seconds: float | None = None,
    trigger_type: str = "cron",
    github_run_id: str | None = None,
    github_run_number: int | None = None,
    notes: str | None = None,
) -> dict:
    if actual_dt is None:
        actual_dt = datetime.now(timezone.utc)
    elif actual_dt.tzinfo is None:
        actual_dt = actual_dt.replace(tzinfo=timezone.utc)

    scheduled_dt, delay_sec, delay_min = calculate_delay(
        actual_dt, scheduled_iso=scheduled_iso, explicit_delay_seconds=delay_seconds
    )

    created_at = datetime.now(timezone.utc).isoformat()
    actual_iso = actual_dt.isoformat()
    scheduled_iso_str = scheduled_dt.isoformat()

    with conn:
        cursor = conn.execute(
            """
            INSERT INTO delays (
                scheduled_time, actual_time, delay_seconds, delay_minutes,
                trigger_type, github_run_id, github_run_number, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scheduled_iso_str,
                actual_iso,
                delay_sec,
                delay_min,
                trigger_type,
                github_run_id,
                github_run_number,
                notes,
                created_at,
            ),
        )
        inserted_id = cursor.lastrowid

    return {
        "id": inserted_id,
        "scheduled_time": scheduled_iso_str,
        "actual_time": actual_iso,
        "delay_seconds": delay_sec,
        "delay_minutes": delay_min,
        "trigger_type": trigger_type,
        "github_run_id": github_run_id,
        "github_run_number": github_run_number,
        "notes": notes,
        "created_at": created_at,
    }


def seed_historical_data(conn: sqlite3.Connection, years: int = 3) -> int:
    now = datetime.now(timezone.utc)
    records = []
    total_days = years * 365

    rng = random.Random(42)

    for days_ago in range(total_days, -1, -1):
        target_date = (now - timedelta(days=days_ago)).date()
        scheduled_dt = datetime.combine(
            target_date, time(TARGET_HOUR, TARGET_MINUTE, 0, tzinfo=timezone.utc)
        )

        # Realistic GitHub Actions queue delay: typically 1.5 - 9 minutes, with occasional spikes
        base_delay_minutes = rng.uniform(1.5, 6.5)
        spike = rng.random()
        if spike < 0.10:
            base_delay_minutes += rng.uniform(4.0, 14.0)
        elif spike < 0.02:
            base_delay_minutes += rng.uniform(12.0, 26.0)

        # Slight trend: queues slightly faster in 2026 vs 2024
        year_offset = (now.year - target_date.year) * 0.6
        base_delay_minutes += year_offset

        delay_seconds = round(base_delay_minutes * 60.0, 1)
        delay_minutes = round(delay_seconds / 60.0, 2)
        actual_dt = scheduled_dt + timedelta(seconds=delay_seconds)

        records.append(
            (
                scheduled_dt.isoformat(),
                actual_dt.isoformat(),
                delay_seconds,
                delay_minutes,
                "cron",
                f"sim-{days_ago}",
                total_days - days_ago + 1,
                "Historical cron run",
                actual_dt.isoformat(),
            )
        )

    with conn:
        conn.execute("DELETE FROM delays WHERE notes LIKE '%Historical%seeded%' OR notes = 'Historical cron run' OR notes = 'Seeded historical run';")
        conn.executemany(
            """
            INSERT INTO delays (
                scheduled_time, actual_time, delay_seconds, delay_minutes,
                trigger_type, github_run_id, github_run_number, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            records,
        )

    return len(records)


def export_data_to_json(
    conn: sqlite3.Connection,
    output_paths: list[Path] = DEFAULT_JSON_PATHS,
) -> dict:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM delays ORDER BY actual_time ASC")
    rows = [dict(row) for row in cursor.fetchall()]

    if not rows:
        data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_runs": 0,
                "all_time_avg_minutes": 0,
                "last_week_avg_minutes": 0,
                "last_month_avg_minutes": 0,
                "yearly_averages": [],
                "last_week_runs": [],
                "latest_run": None,
            },
            "runs": [],
        }
    else:
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        last_week_runs = [
            r
            for r in rows
            if datetime.fromisoformat(r["actual_time"]).replace(tzinfo=timezone.utc)
            >= week_ago
        ]

        last_month_runs = [
            r
            for r in rows
            if datetime.fromisoformat(r["actual_time"]).replace(tzinfo=timezone.utc)
            >= month_ago
        ]

        years_map: dict[int, list[float]] = {}
        for r in rows:
            dt = datetime.fromisoformat(r["actual_time"])
            years_map.setdefault(dt.year, []).append(r["delay_minutes"])

        yearly_averages = []
        for y in sorted(years_map.keys()):
            delays = years_map[y]
            avg = round(sum(delays) / len(delays), 2)
            yearly_averages.append(
                {"year": y, "avg_delay_minutes": avg, "run_count": len(delays)}
            )

        week_delays = [r["delay_minutes"] for r in last_week_runs]
        week_avg = (
            round(sum(week_delays) / len(week_delays), 2) if week_delays else 0.0
        )

        month_delays = [r["delay_minutes"] for r in last_month_runs]
        month_avg = (
            round(sum(month_delays) / len(month_delays), 2) if month_delays else 0.0
        )

        all_delays = [r["delay_minutes"] for r in rows]
        all_avg = round(sum(all_delays) / len(all_delays), 2) if all_delays else 0.0

        latest_run = rows[-1] if rows else None

        data = {
            "generated_at": now.isoformat(),
            "summary": {
                "total_runs": len(rows),
                "all_time_avg_minutes": all_avg,
                "last_week_avg_minutes": week_avg,
                "last_month_avg_minutes": month_avg,
                "yearly_averages": yearly_averages,
                "last_week_runs": last_week_runs,
                "latest_run": latest_run,
            },
            "runs": rows[-500:],
        }

    for path in output_paths:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not write JSON to {path}: {e}")

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Record GitHub Actions cron startup delays"
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="Path to SQLite database file",
    )
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Seed historical data for past 3 years",
    )
    parser.add_argument(
        "--scheduled-time",
        type=str,
        default=None,
        help="Explicit scheduled time ISO string (e.g. 2026-09-08T03:14:00+00:00)",
    )
    parser.add_argument(
        "--actual-time",
        type=str,
        default=None,
        help="Explicit actual time ISO string",
    )
    parser.add_argument(
        "--delay-seconds",
        type=float,
        default=None,
        help="Explicit delay in seconds (overrides time delta calculation)",
    )
    parser.add_argument(
        "--trigger-type",
        type=str,
        default=os.getenv("GITHUB_EVENT_NAME", "cron"),
        help="Trigger type (cron, workflow_dispatch, manual)",
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=os.getenv("GITHUB_RUN_ID"),
        help="GitHub Run ID",
    )
    parser.add_argument(
        "--run-number",
        type=int,
        default=int(os.getenv("GITHUB_RUN_NUMBER", "0"))
        if os.getenv("GITHUB_RUN_NUMBER")
        else None,
        help="GitHub Run Number",
    )
    parser.add_argument(
        "--export-only",
        action="store_true",
        help="Skip recording and only export JSON snapshots",
    )

    args = parser.parse_args()
    conn = get_db_connection(args.db)
    init_db(conn)

    if args.seed:
        count = seed_historical_data(conn)
        print(f"Successfully seeded {count} historical records into {args.db}.")

    if not args.export_only:
        actual_dt = (
            datetime.fromisoformat(args.actual_time) if args.actual_time else None
        )
        record = record_run(
            conn,
            actual_dt=actual_dt,
            scheduled_iso=args.scheduled_time,
            delay_seconds=args.delay_seconds,
            trigger_type=args.trigger_type,
            github_run_id=args.run_id,
            github_run_number=args.run_number,
            notes=f"Triggered by {args.trigger_type}",
        )
        print("Recorded cron execution:")
        print(f"  Scheduled Time: {record['scheduled_time']}")
        print(f"  Actual Time:    {record['actual_time']}")
        print(f"  Delay:          {record['delay_minutes']} min ({record['delay_seconds']}s)")
        print(f"  Trigger:        {record['trigger_type']}")

    exported = export_data_to_json(conn)
    summary = exported["summary"]
    print("\nExported dataset summary:")
    print(f"  Total Runs:          {summary['total_runs']}")
    print(f"  Last Week Avg:       {summary['last_week_avg_minutes']} min")
    print(f"  Last Month Avg:      {summary['last_month_avg_minutes']} min")
    print("  Yearly Averages:")
    for y in summary["yearly_averages"]:
        print(f"    - {y['year']}: {y['avg_delay_minutes']} min ({y['run_count']} runs)")

    conn.close()


if __name__ == "__main__":
    main()

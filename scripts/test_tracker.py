#!/usr/bin/env python3
"""
Unit tests for the Cron Delay Monitor recording engine and calculations.
"""

import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from record_delay import (
    calculate_delay,
    export_data_to_json,
    get_db_connection,
    init_db,
    record_run,
    seed_historical_data,
)


class TestCronDelayTracker(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_delays.db"
        self.json_path = Path(self.temp_dir.name) / "test_delays.json"
        self.conn = get_db_connection(self.db_path)
        init_db(self.conn)

    def tearDown(self):
        self.conn.close()
        self.temp_dir.cleanup()

    def test_calculate_delay_exact_match(self):
        # 03:14:00 exactly
        actual = datetime(2026, 9, 8, 3, 14, 0, tzinfo=timezone.utc)
        scheduled, delay_sec, delay_min = calculate_delay(actual)
        self.assertEqual(scheduled.hour, 3)
        self.assertEqual(scheduled.minute, 14)
        self.assertEqual(delay_sec, 0.0)
        self.assertEqual(delay_min, 0.0)

    def test_calculate_delay_typical_github_delay(self):
        # Started 7 minutes and 30 seconds late: 03:21:30 UTC
        actual = datetime(2026, 9, 8, 3, 21, 30, tzinfo=timezone.utc)
        scheduled, delay_sec, delay_min = calculate_delay(actual)
        self.assertEqual(scheduled.hour, 3)
        self.assertEqual(scheduled.minute, 14)
        self.assertEqual(delay_sec, 450.0)
        self.assertEqual(delay_min, 7.5)

    def test_record_and_query_run(self):
        actual = datetime(2026, 9, 8, 3, 25, 0, tzinfo=timezone.utc)
        record = record_run(
            self.conn,
            actual_dt=actual,
            trigger_type="cron",
            github_run_id="run-12345",
            github_run_number=42,
            notes="Test run",
        )
        self.assertIsNotNone(record["id"])
        self.assertEqual(record["delay_minutes"], 11.0)
        self.assertEqual(record["trigger_type"], "cron")

        # Verify in DB
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM delays WHERE id = ?", (record["id"],))
        row = cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["delay_seconds"], 660.0)
        self.assertEqual(row["github_run_id"], "run-12345")

    def test_seed_and_export_json(self):
        count = seed_historical_data(self.conn, years=2)
        self.assertGreater(count, 700)

        data = export_data_to_json(self.conn, output_paths=[self.json_path])
        self.assertTrue(self.json_path.exists())

        summary = data["summary"]
        self.assertGreaterEqual(summary["total_runs"], 700)
        self.assertGreater(summary["last_week_avg_minutes"], 0.0)
        self.assertGreater(summary["last_month_avg_minutes"], 0.0)
        self.assertGreaterEqual(len(summary["yearly_averages"]), 2)
        self.assertGreaterEqual(len(summary["last_week_runs"]), 6)


if __name__ == "__main__":
    unittest.main()

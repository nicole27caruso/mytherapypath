"""Shared per-exercise weekly-progress helpers, used by the mobile and programs routers.

Weekly targets are a plain count (no specific days assigned) — "past due" is a pacing
heuristic (behind an even 1/7-per-day expectation for the days elapsed so far), not a
missed-a-specific-day check.
"""
import math
from datetime import datetime, timedelta


def week_start_utc(now: datetime | None = None) -> datetime:
    now = now or datetime.utcnow()
    return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


def bucket_submissions_by_exercise(subs) -> dict[str, int]:
    """subs: an already-fetched list of this-week, non-rejected Submission rows."""
    counts: dict[str, int] = {}
    for s in subs:
        counts[s.exercise_name] = counts.get(s.exercise_name, 0) + 1
    return counts


def effective_target(pe_frequency: int | None, program_frequency: int | None) -> int:
    if pe_frequency is not None:
        return pe_frequency
    return program_frequency or 3


def compute_due_status(weekly_count: int, weekly_target: int, iso_weekday: int) -> str:
    """iso_weekday: Mon=1 .. Sun=7."""
    if weekly_target <= 0 or weekly_count >= weekly_target:
        return "complete"
    expected_by_now = math.ceil(weekly_target * iso_weekday / 7)
    if weekly_count < expected_by_now:
        return "past_due"
    return "on_track"

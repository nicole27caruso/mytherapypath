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


def latest_submission_date_by_exercise(subs) -> dict[str, "date"]:
    """subs: an already-fetched list of non-rejected Submission rows (any date range).
    Keeps the most recent submitted_at date per exercise name."""
    latest: dict[str, "date"] = {}
    for s in subs:
        if not s.submitted_at:
            continue
        d = s.submitted_at.date()
        if s.exercise_name not in latest or d > latest[s.exercise_name]:
            latest[s.exercise_name] = d
    return latest


def days_until_available(last_submission_date, min_days_between: int | None, today=None) -> int:
    """0 = can submit now. last_submission_date may be None (never submitted -> always 0)."""
    if not min_days_between or min_days_between <= 0 or last_submission_date is None:
        return 0
    today = today or datetime.utcnow().date()
    days_since = (today - last_submission_date).days
    return max(0, min_days_between - days_since)

"""
workingCalendar.py
──────────────────
Date-arithmetic utilities for the CPM scheduling engine.

All functions respect:
  - working_days : iterable of weekday integers (0=Mon…6=Sun)
  - holidays     : iterable of date objects (non-working specific dates)

Functions are pure (no Django imports) for easy testing.
"""
from datetime import date, timedelta
from typing import Iterable


def _default_working_days():
    """Monday–Friday (weekday integers 0–4)."""
    return [0, 1, 2, 3, 4]


def _is_working_day(d: date, working_days: list, holidays: list) -> bool:
    """Return True if *d* is a working day (correct weekday AND not a holiday)."""
    return d.weekday() in working_days and d not in holidays


def _normalize_holidays(holidays: Iterable) -> list:
    """
    Convert a list of holiday entries to a list of date objects.
    Accepts date objects or ISO-8601 strings ('YYYY-MM-DD').
    """
    result = []
    for h in (holidays or []):
        if isinstance(h, date):
            result.append(h)
        elif isinstance(h, str):
            try:
                result.append(date.fromisoformat(h))
            except ValueError:
                pass  # silently skip malformed entries
    return result


def add_working_days(start: date, n_days: int,
                     working_days: list = None,
                     holidays: list = None) -> date:
    """
    Return the date that is *n_days* working days after *start*.

    If n_days == 0 this returns *start* (for milestones: ES == EF).
    Positive n_days → move forward.
    Negative n_days → delegates to subtract_working_days.

    Example
    -------
    >>> add_working_days(date(2026, 7, 3), 5, [0,1,2,3,4], ["2026-07-04"])
    # July 4 is a holiday; July 5–6 is weekend
    # Working days: Jul 3 (Fri is day 0), then Jul 7(Mon)=1, 8=2, 9=3, 10=4, result = Jul 10
    date(2026, 7, 10)
    """
    if working_days is None:
        working_days = _default_working_days()
    holidays = _normalize_holidays(holidays or [])

    if n_days < 0:
        return subtract_working_days(start, abs(n_days), working_days, holidays)

    if n_days == 0:
        return start

    current = start
    days_added = 0
    while days_added < n_days:
        current += timedelta(days=1)
        if _is_working_day(current, working_days, holidays):
            days_added += 1
    return current


def subtract_working_days(start: date, n_days: int,
                           working_days: list = None,
                           holidays: list = None) -> date:
    """
    Return the date that is *n_days* working days BEFORE *start*.

    Used in the backward pass of the CPM algorithm.
    """
    if working_days is None:
        working_days = _default_working_days()
    holidays = _normalize_holidays(holidays or [])

    if n_days <= 0:
        return start

    current = start
    days_subtracted = 0
    while days_subtracted < n_days:
        current -= timedelta(days=1)
        if _is_working_day(current, working_days, holidays):
            days_subtracted += 1
    return current


def count_working_days(start: date, end: date,
                       working_days: list = None,
                       holidays: list = None) -> int:
    """
    Count the number of working days in the interval [start, end).

    If end <= start, returns 0.
    Used to compute summary task durations.
    """
    if working_days is None:
        working_days = _default_working_days()
    holidays = _normalize_holidays(holidays or [])

    if end <= start:
        return 0

    count = 0
    current = start
    while current < end:
        if _is_working_day(current, working_days, holidays):
            count += 1
        current += timedelta(days=1)
    return count


def advance_to_next_working_day(d: date,
                                working_days: list = None,
                                holidays: list = None) -> date:
    """
    If *d* is already a working day, return *d* unchanged.
    Otherwise advance forward to the next working day.

    Used to snap project start dates / constraint dates to valid working days.
    """
    if working_days is None:
        working_days = _default_working_days()
    holidays = _normalize_holidays(holidays or [])

    current = d
    while not _is_working_day(current, working_days, holidays):
        current += timedelta(days=1)
    return current

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Habit, HabitRecord, User
from app.schemas import AnalyticsOverview, HabitAnalytics, WeeklyPoint

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _longest_streak(days: list):
    if not days:
        return 0
    uniq = sorted(set(days))
    best = 1
    current = 1
    for idx in range(1, len(uniq)):
        if (uniq[idx] - uniq[idx - 1]).days == 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


@router.get("/overview", response_model=AnalyticsOverview)
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        tz = ZoneInfo(current_user.timezone)
    except Exception:
        tz = ZoneInfo("UTC")

    today = datetime.now(tz).date()
    start = today - timedelta(days=6)

    habits = db.query(Habit).filter(Habit.owner_id == current_user.id).all()

    all_records = (
        db.query(HabitRecord)
        .filter(HabitRecord.user_id == current_user.id, HabitRecord.done_on >= start)
        .all()
    )

    daily = {start + timedelta(days=i): 0 for i in range(7)}
    for record in all_records:
        if record.done_on in daily:
            daily[record.done_on] += 1

    habit_stats = []
    for habit in habits:
        records = (
            db.query(HabitRecord)
            .filter(HabitRecord.user_id == current_user.id, HabitRecord.habit_id == habit.id)
            .all()
        )
        completed_last_week = sum(1 for record in records if record.done_on >= start)
        adherence = min(100.0, round((completed_last_week / max(1, habit.frequency_per_week)) * 100, 2))
        streak = _longest_streak([record.done_on for record in records])
        habit_stats.append(
            HabitAnalytics(
                habit_id=habit.id,
                title=habit.title,
                adherence_percent=adherence,
                longest_streak=streak,
            )
        )

    return AnalyticsOverview(
        weekly_chart=[WeeklyPoint(day=day, completions=count) for day, count in sorted(daily.items())],
        habits=habit_stats,
    )

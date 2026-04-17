from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Habit, HabitRecord, User
from app.schemas import HabitCreate, HabitRead, HabitRecordCreate, HabitRecordRead

router = APIRouter(prefix="/habits", tags=["habits"])


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group_tag = payload.group_tag.strip() if payload.group_tag else None
    if payload.is_group and not group_tag:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="group_tag is required for group habits")

    habit = Habit(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        frequency_per_week=payload.frequency_per_week,
        is_group=payload.is_group,
        group_tag=group_tag,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("", response_model=list[HabitRead])
def list_habits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Habit)
        .filter((Habit.owner_id == current_user.id) | (Habit.is_group.is_(True)))
        .order_by(Habit.created_at.desc())
        .all()
    )


@router.post("/{habit_id}/records", response_model=HabitRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(
    habit_id: int,
    payload: HabitRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    if habit.owner_id != current_user.id and not habit.is_group:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this habit")

    done_on = payload.done_on or date.today()

    exists = (
        db.query(HabitRecord)
        .filter(
            HabitRecord.habit_id == habit.id,
            HabitRecord.user_id == current_user.id,
            HabitRecord.done_on == done_on,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Habit already tracked for this day")

    record = HabitRecord(
        habit_id=habit.id,
        user_id=current_user.id,
        done_on=done_on,
        note=payload.note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{habit_id}/records", response_model=list[HabitRecordRead])
def get_records(habit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")

    if habit.owner_id != current_user.id and not habit.is_group:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this habit")

    return (
        db.query(HabitRecord)
        .filter(HabitRecord.habit_id == habit_id, HabitRecord.user_id == current_user.id)
        .order_by(HabitRecord.done_on.desc())
        .all()
    )

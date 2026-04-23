import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Group, GroupMembership, Habit, HabitRecord, User
from app.schemas import GroupCreate, GroupJoinInput, GroupRead, LeaderboardItem

router = APIRouter(prefix="/groups", tags=["groups"])


def _group_read(db: Session, group: Group) -> GroupRead:
    member_count = db.query(func.count(GroupMembership.id)).filter(GroupMembership.group_id == group.id).scalar() or 0
    return GroupRead(
        id=group.id,
        name=group.name,
        invite_code=group.invite_code,
        owner_id=group.owner_id,
        member_count=member_count,
        created_at=group.created_at,
    )


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite_code = secrets.token_urlsafe(8)[:10]
    group = Group(name=payload.name, invite_code=invite_code, owner_id=current_user.id)
    db.add(group)
    db.flush()

    db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role="admin"))
    db.commit()
    db.refresh(group)
    return _group_read(db, group)


@router.post("/join", response_model=GroupRead)
def join_group(
    payload: GroupJoinInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.invite_code == payload.invite_code).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    membership = (
        db.query(GroupMembership)
        .filter(GroupMembership.group_id == group.id, GroupMembership.user_id == current_user.id)
        .first()
    )
    if not membership:
        db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role="member"))
        db.commit()

    return _group_read(db, group)


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    groups = (
        db.query(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .filter(GroupMembership.user_id == current_user.id)
        .order_by(Group.created_at.desc())
        .all()
    )
    return [_group_read(db, group) for group in groups]


@router.get("/{group_id}/leaderboard", response_model=list[LeaderboardItem])
def group_leaderboard(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    membership = (
        db.query(GroupMembership)
        .filter(GroupMembership.group_id == group_id, GroupMembership.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Join group to see leaderboard")

    rows = (
        db.query(User.id, User.username, func.count(HabitRecord.id).label("completions"))
        .join(GroupMembership, GroupMembership.user_id == User.id)
        .join(Habit, Habit.group_id == GroupMembership.group_id)
        .outerjoin(HabitRecord, (HabitRecord.habit_id == Habit.id) & (HabitRecord.user_id == User.id))
        .filter(GroupMembership.group_id == group_id)
        .group_by(User.id, User.username)
        .order_by(func.count(HabitRecord.id).desc(), User.username.asc())
        .all()
    )
    return [LeaderboardItem(user_id=row.id, username=row.username, completions=row.completions) for row in rows]

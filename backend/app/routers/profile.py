import os
import uuid
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import ProfileUpdate, UserRead

router = APIRouter(prefix="/profile", tags=["profile"])


@router.patch("", response_model=UserRead)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.timezone is not None:
        try:
            ZoneInfo(payload.timezone)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid timezone") from exc
        current_user.timezone = payload.timezone

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/avatar", response_model=UserRead)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are supported")

    os.makedirs(settings.uploads_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "avatar.png")[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(settings.uploads_dir, filename)

    with open(full_path, "wb") as out:
        out.write(file.file.read())

    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

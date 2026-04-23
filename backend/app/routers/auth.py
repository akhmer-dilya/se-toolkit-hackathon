from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import PasswordResetToken, RefreshToken, User
from app.schemas import (
    LoginInput,
    LogoutInput,
    PasswordForgotInput,
    PasswordForgotResult,
    PasswordResetInput,
    RefreshInput,
    Token,
    UserCreate,
    UserRead,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_password_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(or_(User.username == payload.username, User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already used")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(or_(User.username == payload.username_or_email, User.email == payload.username_or_email))
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(user.username)
    refresh_token, token_id, expires_at = create_refresh_token(user.username)
    db.add(RefreshToken(token_id=token_id, user_id=user.id, expires_at=expires_at.replace(tzinfo=None)))
    db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshInput, db: Session = Depends(get_db)):
    token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    username = token_payload.get("sub") if token_payload else None
    token_id = token_payload.get("jti") if token_payload else None
    if not username or not token_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    stored = db.query(RefreshToken).filter(RefreshToken.token_id == token_id, RefreshToken.user_id == user.id).first()
    if not stored or stored.revoked_at is not None or stored.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or revoked")

    stored.revoked_at = datetime.utcnow()
    new_refresh, new_token_id, expires_at = create_refresh_token(user.username)
    db.add(RefreshToken(token_id=new_token_id, user_id=user.id, expires_at=expires_at.replace(tzinfo=None)))
    db.commit()

    return Token(access_token=create_access_token(user.username), refresh_token=new_refresh)


@router.post("/logout")
def logout(payload: LogoutInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    token_id = token_payload.get("jti") if token_payload else None
    if token_id:
        token_row = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_id == token_id, RefreshToken.user_id == current_user.id)
            .first()
        )
        if token_row and token_row.revoked_at is None:
            token_row.revoked_at = datetime.utcnow()
            db.commit()
    return {"message": "Logged out"}


@router.post("/forgot-password", response_model=PasswordForgotResult)
def forgot_password(payload: PasswordForgotInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return PasswordForgotResult(message="If the email exists, a reset token has been generated")

    raw_token = generate_password_reset_token()
    token_hash = hash_reset_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)

    db.add(PasswordResetToken(token_hash=token_hash, user_id=user.id, expires_at=expires_at))
    db.commit()

    return PasswordForgotResult(message="Reset token generated (dev mode)", reset_token=raw_token)


@router.post("/reset-password")
def reset_password(payload: PasswordResetInput, db: Session = Depends(get_db)):
    token_hash = hash_reset_token(payload.reset_token)
    reset_row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if not reset_row or reset_row.used_at is not None or reset_row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset_row.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    reset_row.used_at = datetime.utcnow()
    db.commit()
    return {"message": "Password updated"}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user

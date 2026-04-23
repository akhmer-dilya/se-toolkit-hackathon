import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.refresh_token_expire_minutes)
    token_id = secrets.token_hex(16)
    payload = {"sub": subject, "exp": expire, "jti": token_id, "type": "refresh"}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM), token_id, expire


def decode_token(token: str, expected_type: str | None = None) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if expected_type and token_type != expected_type:
            return None
        return payload
    except JWTError:
        return None


def generate_password_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_reset_token(reset_token: str) -> str:
    return hashlib.sha256(reset_token.encode("utf-8")).hexdigest()

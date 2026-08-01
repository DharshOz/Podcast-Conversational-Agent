from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from Backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from . import users as users_db

# Using bcrypt directly — passlib 1.7.4 is incompatible with bcrypt >= 4.0
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def authenticate_user(username: str, password: str) -> dict | None:
    user = users_db.get_user(username)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = users_db.get_user(username)
    if not user:
        raise credentials_exception
    return user
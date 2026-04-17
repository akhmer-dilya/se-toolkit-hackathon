from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginInput(BaseModel):
    username_or_email: str
    password: str


class HabitCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=1000)
    frequency_per_week: int = Field(default=3, ge=1, le=7)
    is_group: bool = False
    group_tag: str | None = Field(default=None, max_length=40)


class HabitRead(BaseModel):
    id: int
    owner_id: int
    title: str
    description: str
    frequency_per_week: int
    is_group: bool
    group_tag: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitRecordCreate(BaseModel):
    done_on: date | None = None
    note: str = Field(default="", max_length=255)


class HabitRecordRead(BaseModel):
    id: int
    habit_id: int
    user_id: int
    done_on: date
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitWithRecords(BaseModel):
    habit: HabitRead
    records: list[HabitRecordRead]

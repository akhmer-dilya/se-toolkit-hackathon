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
    avatar_url: str | None
    timezone: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshInput(BaseModel):
    refresh_token: str


class LogoutInput(BaseModel):
    refresh_token: str


class LoginInput(BaseModel):
    username_or_email: str
    password: str


class PasswordForgotInput(BaseModel):
    email: EmailStr


class PasswordForgotResult(BaseModel):
    message: str
    reset_token: str | None = None


class PasswordResetInput(BaseModel):
    reset_token: str
    new_password: str = Field(min_length=6, max_length=128)


class ProfileUpdate(BaseModel):
    timezone: str | None = Field(default=None, max_length=64)


class HabitCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=1000)
    frequency_per_week: int = Field(default=3, ge=1, le=7)
    is_group: bool = False
    group_id: int | None = None
    group_tag: str | None = Field(default=None, max_length=40)


class HabitRead(BaseModel):
    id: int
    owner_id: int
    group_id: int | None
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


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class GroupJoinInput(BaseModel):
    invite_code: str = Field(min_length=6, max_length=24)


class GroupRead(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_id: int
    member_count: int
    created_at: datetime


class LeaderboardItem(BaseModel):
    user_id: int
    username: str
    completions: int


class WeeklyPoint(BaseModel):
    day: date
    completions: int


class HabitAnalytics(BaseModel):
    habit_id: int
    title: str
    adherence_percent: float
    longest_streak: int


class AnalyticsOverview(BaseModel):
    weekly_chart: list[WeeklyPoint]
    habits: list[HabitAnalytics]

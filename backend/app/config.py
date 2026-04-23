from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 120
    refresh_token_expire_minutes: int = 10080
    password_reset_expire_minutes: int = 30
    frontend_origin: str = "http://localhost:5173"
    uploads_dir: str = "uploads"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "VMC Bridge API"
    version: str = "0.1.0"
    debug: bool = True

    database_url: str | None = None
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT Authentication Settings
    secret_key: str = "your-secret-key-change-in-production-min-32-chars-long"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # reCAPTCHA Settings
    recaptcha_secret_key: str = "your-recaptcha-secret-key"

    # AI remediation generation settings
    gemini_api_key: str | None = None
    gemini_models: str = "gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite,gemini-1.5-flash,gemini-1.5-flash-8b,gemini-2.5-flash-lite"
    ai_request_timeout_seconds: int = 45
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env that aren't defined in Settings


def get_settings() -> Settings:
    return Settings()

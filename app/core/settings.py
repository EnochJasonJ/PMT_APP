from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    debug: bool = False
    app_env: str = "development"

    # Security
    SECRET_KEY: str = "your-secret-key-for-development"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Fernet key for encrypting secrets at rest (admin request reply credentials).
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = "RdI5SJDE6Av5TT0x-UH_ngjhTTRbNPJTAJAXqAN8bGo="  # Change in production

    # Email (Resend) + invitations
    RESEND_API_KEY: str = ""  # set in .env to enable real email sending
    EMAIL_FROM: str = "onboarding@resend.dev"  # switch to invites@appxcess.com after domain verify
    APP_BASE_URL: str = "http://localhost:3000"  # frontend origin for invite links
    INVITE_EXPIRE_HOURS: int = 72

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()

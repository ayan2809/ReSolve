from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Default to local, but override via env var which is auto-loaded by pydantic BaseSettings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/resolve"
    NOTIFICATION_TIME: str = "09:00" # HH:MM format
    SUPABASE_ANON_KEY: str = "" # Optional, locally empty
    GEMINI_API_KEY: str = "" # Optional, for failure intelligence analysis

    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

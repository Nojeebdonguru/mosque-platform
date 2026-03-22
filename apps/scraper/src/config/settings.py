from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    env: str = "development"
    log_level: str = "INFO"

    # Backend API
    api_url: str = "http://localhost:3001"
    api_email: str = "scraper@mosque-platform.com"
    api_password: str = "scraper_password_123"

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 2000

    # Playwright
    browser_headless: bool = True
    request_delay_ms: int = 2000
    page_timeout_ms: int = 30000

    # Scraping limits
    max_retries: int = 3
    confidence_threshold: float = 0.7
    max_mosques_per_run: int = 50

    # Proxy (optional)
    proxy_url: Optional[str] = None


settings = Settings()  # type: ignore

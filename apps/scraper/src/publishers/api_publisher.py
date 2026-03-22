"""
Publishes validated mosque data to the backend API.
Handles authentication and duplicate detection.
"""

import aiohttp
from loguru import logger
from src.config.settings import settings


class APIPublisher:
    def __init__(self):
        self._token: str | None = None
        self._session: aiohttp.ClientSession | None = None

    async def start(self):
        self._session = aiohttp.ClientSession(
            headers={"Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=30),
        )
        await self._authenticate()

    async def stop(self):
        if self._session:
            await self._session.close()

    async def _authenticate(self):
        """Login or register scraper account and get JWT token."""
        url = f"{settings.api_url}/api/v1/auth/login"
        payload = {"email": settings.api_email, "password": settings.api_password}

        async with self._session.post(url, json=payload) as resp:
            if resp.status == 200:
                data = await resp.json()
                self._token = data["data"]["accessToken"]
                logger.info("Authenticated with backend API")
                return

        # If login fails, register the scraper account
        logger.info("Login failed — registering scraper account")
        register_url = f"{settings.api_url}/api/v1/auth/register"
        register_payload = {
            "email": settings.api_email,
            "password": settings.api_password,
            "username": "scraper_bot",
            "displayName": "AI Scraper",
        }
        async with self._session.post(register_url, json=register_payload) as resp:
            if resp.status in (200, 201):
                data = await resp.json()
                self._token = data["data"]["accessToken"]
                logger.info("Registered and authenticated scraper account")
            else:
                body = await resp.text()
                raise Exception(f"Authentication failed: {body}")

    async def publish(self, mosque_data: dict) -> bool:
        """POST a mosque to the backend API. Returns True if successful."""
        if not self._token:
            await self._authenticate()

        url = f"{settings.api_url}/api/v1/mosques"
        headers = {"Authorization": f"Bearer {self._token}"}

        async with self._session.post(url, json=mosque_data, headers=headers) as resp:
            if resp.status in (200, 201):
                data = await resp.json()
                mosque_id = data.get("data", {}).get("id", "unknown")
                logger.success(f"Published: {mosque_data['name_primary']} [{mosque_id}]")
                return True
            elif resp.status == 401:
                logger.warning("Token expired — re-authenticating")
                await self._authenticate()
                return await self.publish(mosque_data)
            else:
                body = await resp.text()
                logger.error(f"Failed to publish {mosque_data['name_primary']}: {resp.status} {body}")
                return False

    async def publish_batch(self, mosques: list[dict]) -> tuple[int, int]:
        """Publish multiple mosques. Returns (success_count, fail_count)."""
        success = 0
        failed = 0
        for mosque in mosques:
            ok = await self.publish(mosque)
            if ok:
                success += 1
            else:
                failed += 1
        return success, failed

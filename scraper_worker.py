"""
Playwright-based headless browser worker.
Fetches pages, takes screenshots, and passes to AI extractor.
"""

import asyncio
import tempfile
from pathlib import Path
from typing import Optional

from loguru import logger
from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Playwright,
    async_playwright,
)
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config.settings import settings
from src.extractors.ai_extractor import AIExtractor
from src.publishers.kafka_publisher import KafkaPublisher
from src.validators.mosque_validator import MosqueValidator


class ScraperWorker:
    def __init__(self) -> None:
        self.extractor = AIExtractor()
        self.validator = MosqueValidator()
        self.publisher = KafkaPublisher()
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None

    async def start(self) -> None:
        self._playwright = await async_playwright().start()
        launch_options = {
            "headless": settings.browser_headless,
            "args": [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        }
        if settings.proxy_url:
            launch_options["proxy"] = {
                "server": settings.proxy_url,
                "username": settings.proxy_username,
                "password": settings.proxy_password,
            }
        self._browser = await self._playwright.chromium.launch(**launch_options)
        logger.info("Playwright browser started")

    async def stop(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Playwright browser stopped")

    async def _create_context(self) -> BrowserContext:
        return await self._browser.new_context(  # type: ignore[union-attr]
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            timezone_id="America/New_York",
            java_script_enabled=True,
            ignore_https_errors=True,
        )

    @retry(
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential(multiplier=2, min=3, max=30),
        reraise=True,
    )
    async def scrape(
        self,
        url: str,
        job_id: str,
        country: str,
    ) -> dict:
        """
        Scrape a URL: fetch page, screenshot, extract, validate, publish.
        Returns the extracted and validated mosque data.
        """
        context = await self._create_context()
        page = await context.new_page()

        try:
            logger.info(f"Scraping [{job_id}]: {url}")

            # Navigate with timeout
            await page.goto(
                url,
                wait_until="networkidle",
                timeout=settings.page_load_timeout_ms,
            )

            # Wait for main content to render
            await page.wait_for_timeout(1500)

            # Get page HTML
            html = await page.content()

            # Take screenshot for archive + AI vision
            screenshot_path = None
            if settings.screenshot_archive:
                with tempfile.NamedTemporaryFile(
                    suffix=".png", delete=False
                ) as tmp:
                    screenshot_path = tmp.name
                await page.screenshot(
                    path=screenshot_path,
                    full_page=False,   # Viewport only — cheaper for vision API
                    type="png",
                )

            # Polite delay
            await asyncio.sleep(settings.request_delay_ms / 1000)

            # Extract with AI
            raw_data = await self.extractor.extract(
                html=html,
                url=url,
                screenshot_path=screenshot_path,
                country_hint=country,
            )

            # Validate and normalise
            validated = self.validator.validate(raw_data, source_url=url, job_id=job_id)

            # Publish to Kafka for ingestion service
            await self.publisher.publish_scraped(validated)

            logger.success(
                f"Scraped [{job_id}]: {validated.get('name', 'unknown')} "
                f"(confidence: {validated.get('overall_confidence', 0):.2f})"
            )
            return validated

        except Exception as e:
            logger.error(f"Scrape failed [{job_id}] {url}: {e}")
            raise
        finally:
            await page.close()
            await context.close()
            # Clean up temp screenshot
            if screenshot_path and Path(screenshot_path).exists():
                Path(screenshot_path).unlink(missing_ok=True)

    async def scrape_batch(
        self,
        jobs: list[dict],
        concurrency: int = 5,
    ) -> list[dict]:
        """
        Scrape multiple URLs with bounded concurrency.
        """
        semaphore = asyncio.Semaphore(concurrency)
        results = []

        async def bounded_scrape(job: dict) -> Optional[dict]:
            async with semaphore:
                try:
                    return await self.scrape(
                        url=job["url"],
                        job_id=job["id"],
                        country=job.get("country", "unknown"),
                    )
                except Exception as e:
                    logger.error(f"Job {job['id']} failed after retries: {e}")
                    return None

        tasks = [bounded_scrape(job) for job in jobs]
        raw_results = await asyncio.gather(*tasks, return_exceptions=False)
        results = [r for r in raw_results if r is not None]

        logger.info(
            f"Batch complete: {len(results)}/{len(jobs)} successful"
        )
        return results

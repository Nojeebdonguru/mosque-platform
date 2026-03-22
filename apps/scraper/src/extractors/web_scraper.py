"""
Playwright-based web scraper.
Fetches mosque pages and passes HTML to the AI extractor.
"""

import asyncio
from typing import Optional
from loguru import logger
from playwright.async_api import async_playwright, Browser, BrowserContext
from tenacity import retry, stop_after_attempt, wait_exponential
from src.config.settings import settings
from src.extractors.ai_extractor import AIExtractor


class WebScraper:
    def __init__(self):
        self.extractor = AIExtractor()
        self._browser: Optional[Browser] = None
        self._playwright = None

    async def start(self):
        self._playwright = await async_playwright().start()
        launch_opts = {
            "headless": settings.browser_headless,
            "args": ["--no-sandbox", "--disable-dev-shm-usage"],
        }
        if settings.proxy_url:
            launch_opts["proxy"] = {"server": settings.proxy_url}
        self._browser = await self._playwright.chromium.launch(**launch_opts)
        logger.info("Browser started")

    async def stop(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Browser stopped")

    async def _make_context(self) -> BrowserContext:
        return await self._browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            ignore_https_errors=True,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=3, max=20),
        reraise=True,
    )
    async def scrape(self, url: str, country: str = "unknown") -> dict:
        context = await self._make_context()
        page = await context.new_page()

        try:
            logger.info(f"Scraping: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=settings.page_timeout_ms)
            await page.wait_for_timeout(1500)
            html = await page.content()

            # Extract with AI
            data = await self.extractor.extract(html, url, country)

            # Polite delay
            await asyncio.sleep(settings.request_delay_ms / 1000)

            return data

        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            raise
        finally:
            await page.close()
            await context.close()

    async def scrape_batch(self, jobs: list[dict], concurrency: int = 3) -> list[dict]:
        semaphore = asyncio.Semaphore(concurrency)
        results = []

        async def bounded_scrape(job: dict):
            async with semaphore:
                try:
                    data = await self.scrape(job["url"], job.get("country", "unknown"))
                    data["_source_url"] = job["url"]
                    data["_country"] = job.get("country", "unknown")
                    return data
                except Exception as e:
                    logger.error(f"Job failed {job['url']}: {e}")
                    return None

        tasks = [bounded_scrape(job) for job in jobs]
        raw = await asyncio.gather(*tasks)
        results = [r for r in raw if r is not None]
        logger.info(f"Batch complete: {len(results)}/{len(jobs)} successful")
        return results

import asyncio
from loguru import logger
from src.config.settings import settings
from src.config.seeds import ALL_SEED_URLS
from src.extractors.web_scraper import WebScraper
from src.validators.mosque_validator import MosqueValidator
from src.publishers.api_publisher import APIPublisher

class JobScheduler:
    def __init__(self):
        self.scraper = WebScraper()
        self.validator = MosqueValidator()
        self.publisher = APIPublisher()
        self.stats = {"scraped": 0, "validated": 0, "published": 0, "failed": 0, "skipped": 0}

    async def run(self):
        logger.info(f"Starting pipeline — {len(ALL_SEED_URLS)} URLs to process")
        await self.scraper.start()
        await self.publisher.start()
        try:
            seeds = ALL_SEED_URLS[:settings.max_mosques_per_run]
            for i, seed in enumerate(seeds):
                try:
                    data = await self.scraper.scrape(seed["url"], seed.get("country", "unknown"))
                    data["_source_url"] = seed["url"]
                    await self._process(data)
                except Exception as e:
                    logger.error(f"Failed {seed['url']}: {e}")
                    self.stats["failed"] += 1
                if (i + 1) % 5 == 0:
                    logger.info(f"Progress: {i+1}/{len(seeds)} — Published: {self.stats['published']}")
        finally:
            await self.scraper.stop()
            await self.publisher.stop()
            self._summary()

    async def _process(self, data):
        self.stats["scraped"] += 1
        url = data.get("_source_url", "")
        validated = self.validator.validate(data, url)
        if not validated:
            self.stats["skipped"] += 1
            return
        self.stats["validated"] += 1
        if validated["confidence"] >= settings.confidence_threshold:
            ok = await self.publisher.publish(validated)
            if ok:
                self.stats["published"] += 1
            else:
                self.stats["failed"] += 1
        else:
            self.stats["skipped"] += 1

    def _summary(self):
        logger.info("=" * 40)
        logger.info("SCRAPING COMPLETE")
        for k, v in self.stats.items():
            logger.info(f"  {k}: {v}")
        logger.info("=" * 40)
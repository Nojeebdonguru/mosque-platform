"""
Mosque Platform Scraper — Main Entry Point
Runs the full AI scraping pipeline:
1. Discover mosque URLs from seed sources
2. Scrape each page with Playwright
3. Extract data with GPT-4o
4. Validate and normalise
5. POST to the backend API
"""

import asyncio
import os
import sys
from loguru import logger
from src.config.settings import settings
from src.schedulers.job_scheduler import JobScheduler


async def main():
    logger.info("Starting Mosque Platform Scraper")
    logger.info(f"Environment: {settings.env}")
    logger.info(f"Backend API: {settings.api_url}")

    scheduler = JobScheduler()

    try:
        await scheduler.run()
    except KeyboardInterrupt:
        logger.info("Scraper stopped by user")
    except Exception as e:
        logger.error(f"Scraper crashed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

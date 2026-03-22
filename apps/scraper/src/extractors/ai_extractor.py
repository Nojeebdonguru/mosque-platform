"""
GPT-4o powered mosque data extractor.
Takes raw HTML and extracts structured mosque information.
"""

import json
from typing import Any
from loguru import logger
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from src.config.settings import settings


SYSTEM_PROMPT = """You are a precise data extraction assistant specialising in mosque information.

Extract structured data from the HTML content provided.

RULES:
- Only extract information explicitly present in the content
- Never invent or assume missing information
- For each field provide a confidence score 0.0 to 1.0
- Normalise phone numbers to E.164 format where possible
- Extract all prayer times if listed
- For denomination: only use sunni, shia, sufi, ahmadiyya, ibadi, or other

Return ONLY valid JSON. No explanation, no markdown."""

EXTRACTION_PROMPT = """Extract mosque information from this webpage.

URL: {url}
Country hint: {country}

HTML:
{html}

Return JSON with these fields (omit fields not found):
{{
  "name": "mosque name in English",
  "name_arabic": "Arabic name if present",
  "address_street": "street address",
  "address_city": "city",
  "address_country": "country name",
  "address_country_code": "2-letter ISO code",
  "latitude": number or null,
  "longitude": number or null,
  "phone": "phone number",
  "email": "email address",
  "website": "website URL",
  "denomination": "sunni/shia/sufi/ahmadiyya/ibadi/other",
  "capacity": number or null,
  "facilities": ["parking", "womens_section", etc],
  "description": "brief description",
  "languages": ["en", "ar", etc],
  "overall_confidence": 0.0 to 1.0,
  "is_mosque": true or false
}}"""


class AIExtractor:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    def _clean_html(self, html: str, max_chars: int = 10000) -> str:
        import re
        html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<!--.*?-->", "", html, flags=re.DOTALL)
        html = re.sub(r"<[^>]+>", " ", html)
        html = re.sub(r"\s{3,}", " ", html)
        return html[:max_chars].strip()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=30),
        reraise=True,
    )
    async def extract(self, html: str, url: str, country: str = "unknown") -> dict[str, Any]:
        cleaned = self._clean_html(html)
        if len(cleaned) < 100:
            logger.warning(f"Too little content from {url}")
            return {"is_mosque": False, "overall_confidence": 0.0}

        prompt = EXTRACTION_PROMPT.format(
            url=url,
            country=country,
            html=cleaned,
        )

        response = await self.client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=settings.openai_max_tokens,
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        logger.info(f"Extracted from {url} — confidence: {data.get('overall_confidence', 0):.2f}")
        return data

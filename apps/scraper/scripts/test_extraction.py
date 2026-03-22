"""
Quick test: extract data from a single mosque URL.
Usage: python scripts/test_extraction.py
"""

import asyncio
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.extractors.ai_extractor import AIExtractor
from src.validators.mosque_validator import MosqueValidator


async def test():
    extractor = AIExtractor()
    validator = MosqueValidator()

    # Test with a simple HTML snippet
    html = """
    <html><body>
    <h1>East London Mosque</h1>
    <p>82-92 Whitechapel Rd, London E1 1JQ</p>
    <p>Phone: +44 20 7650 3000</p>
    <p>Email: info@eastlondonmosque.org.uk</p>
    <p>One of the largest mosques in the UK, serving the Muslim community since 1910.</p>
    <p>Denomination: Sunni</p>
    <p>Capacity: 7,000 worshippers</p>
    <p>Facilities: Parking, Women's section, Library, Funeral services</p>
    <p>Coordinates: 51.5184, -0.0613</p>
    </body></html>
    """

    print("Extracting mosque data...")
    data = await extractor.extract(html, "https://eastlondonmosque.org.uk", "GB")
    print("Raw extraction:")
    print(json.dumps(data, indent=2))

    print("\nValidating...")
    validated = validator.validate(data, "https://eastlondonmosque.org.uk")
    if validated:
        print("Validated mosque data:")
        print(json.dumps(validated, indent=2))
    else:
        print("Validation failed")


if __name__ == "__main__":
    asyncio.run(test())

"""
Validates and normalises extracted mosque data.
"""

import re
from typing import Optional, Any
from loguru import logger

try:
    import phonenumbers
    HAS_PHONENUMBERS = True
except ImportError:
    HAS_PHONENUMBERS = False


VALID_DENOMINATIONS = {"sunni", "shia", "sufi", "ahmadiyya", "ibadi", "other"}

VALID_FACILITIES = {
    "parking", "wheelchair_access", "womens_section", "library",
    "school", "funeral_services", "ablution_area", "quran_classes",
}


class MosqueValidator:
    def validate(self, data: dict[str, Any], source_url: str = "") -> Optional[dict]:
        if not data.get("is_mosque", True):
            logger.debug(f"Not a mosque page: {source_url}")
            return None

        confidence = float(data.get("overall_confidence", 0))
        if confidence < 0.3:
            logger.debug(f"Too low confidence ({confidence:.2f}): {source_url}")
            return None

        name = data.get("name", "").strip()
        if not name or len(name) < 3:
            logger.debug(f"No valid name found: {source_url}")
            return None

        city = data.get("address_city", "").strip()
        country = data.get("address_country", "").strip()
        country_code = data.get("address_country_code", "").strip().upper()

        if not city or not country:
            logger.debug(f"Missing city/country: {source_url}")
            return None

        # Validate coordinates
        lat = data.get("latitude")
        lng = data.get("longitude")
        if lat is not None and lng is not None:
            try:
                lat = float(lat)
                lng = float(lng)
                if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                    lat, lng = None, None
            except (ValueError, TypeError):
                lat, lng = None, None

        if lat is None or lng is None:
            logger.debug(f"No valid coordinates for {name} — skipping")
            return None

        # Normalise phone
        phone = data.get("phone")
        if phone and HAS_PHONENUMBERS:
            try:
                parsed = phonenumbers.parse(phone, country_code or None)
                if phonenumbers.is_valid_number(parsed):
                    phone = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except Exception:
                pass

        # Normalise denomination
        denomination = str(data.get("denomination", "sunni")).lower().strip()
        if denomination not in VALID_DENOMINATIONS:
            denomination = "other"

        # Normalise facilities
        raw_facilities = data.get("facilities", [])
        facilities = [f.lower().replace(" ", "_") for f in raw_facilities if isinstance(f, str)]
        facilities = [f for f in facilities if f in VALID_FACILITIES]

        # Normalise email
        email = data.get("email", "")
        if email and "@" not in email:
            email = None

        # Normalise website
        website = data.get("website", "")
        if website and not website.startswith(("http://", "https://")):
            website = "https://" + website

        return {
            "name_primary": name,
            "name_arabic": data.get("name_arabic") or None,
            "address_street": data.get("address_street") or None,
            "address_city": city,
            "address_country": country,
            "address_country_code": country_code or "XX",
            "lat": lat,
            "lng": lng,
            "denomination": denomination,
            "capacity": int(data["capacity"]) if data.get("capacity") else None,
            "facilities": facilities,
            "phone": phone or None,
            "email": email or None,
            "website": website or None,
            "description": (data.get("description") or "")[:500] or None,
            "languages": data.get("languages") or [],
            "confidence": round(confidence, 3),
            "source_url": source_url,
        }

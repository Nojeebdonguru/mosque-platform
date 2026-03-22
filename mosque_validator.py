"""
Validates and normalises raw extracted mosque data.
Uses Pydantic for schema validation + custom business logic.
"""

import re
from typing import Any, Optional

import phonenumbers
from geopy.geocoders import Nominatim
from loguru import logger
from pydantic import BaseModel, EmailStr, field_validator, model_validator


class ExtractedMosque(BaseModel):
    job_id: str
    source_url: str
    overall_confidence: float = 0.0

    # Name
    name: Optional[str] = None
    name_arabic: Optional[str] = None
    name_transliteration: Optional[str] = None

    # Address
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    address_postal_code: Optional[str] = None

    # Geo
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Contact
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

    # Details
    denomination: Optional[str] = "sunni"
    capacity: Optional[int] = None
    facilities: list[str] = []
    prayer_times: dict[str, str] = {}
    jumuah_time: Optional[str] = None
    description: Optional[str] = None
    founded_year: Optional[int] = None
    languages: list[str] = []

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError(f"Invalid latitude: {v}")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError(f"Invalid longitude: {v}")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def normalise_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        try:
            parsed = phonenumbers.parse(v, None)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.E164
                )
        except Exception:
            pass
        return v  # Return raw if parsing fails

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, v: Optional[str]) -> Optional[str]:
        return v.lower().strip() if v else None

    @field_validator("website", mode="before")
    @classmethod
    def normalise_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v.rstrip("/")

    @field_validator("denomination")
    @classmethod
    def normalise_denomination(cls, v: Optional[str]) -> str:
        valid = {"sunni", "shia", "sufi", "ahmadiyya", "ibadi"}
        if v and v.lower() in valid:
            return v.lower()
        return "other"

    @field_validator("founded_year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (622 <= v <= 2024):
            return None  # Ignore clearly wrong years
        return v


class MosqueValidator:
    def __init__(self) -> None:
        self._geocoder = Nominatim(user_agent="mosque-platform-scraper/1.0")

    def validate(
        self,
        raw_data: dict[str, Any],
        source_url: str,
        job_id: str,
    ) -> dict[str, Any]:
        """
        Validate, normalise, and score the extracted mosque data.
        Returns a dict ready to publish to Kafka.
        """
        try:
            mosque = ExtractedMosque(
                job_id=job_id,
                source_url=source_url,
                **{k: v for k, v in raw_data.items() if k != "job_id"},
            )
        except Exception as e:
            logger.warning(f"Validation errors for {source_url}: {e}")
            # Partial validation — save what we can
            mosque = ExtractedMosque(
                job_id=job_id,
                source_url=source_url,
                name=raw_data.get("name"),
                address_country=raw_data.get("address_country"),
                overall_confidence=0.3,
            )

        # Recalculate confidence based on field completeness
        mosque = self._score_confidence(mosque)

        return mosque.model_dump()

    def _score_confidence(self, mosque: ExtractedMosque) -> ExtractedMosque:
        """
        Compute a confidence score based on how many key fields were extracted.
        Weighted: name > coords > address > contact
        """
        score = 0.0
        weights = {
            "name": 0.25,
            "latitude": 0.15,
            "longitude": 0.15,
            "address_city": 0.10,
            "address_country": 0.10,
            "phone": 0.08,
            "denomination": 0.07,
            "address_street": 0.05,
            "email": 0.03,
            "website": 0.02,
        }
        for field, weight in weights.items():
            if getattr(mosque, field, None):
                score += weight

        mosque.overall_confidence = round(min(score, 1.0), 3)
        return mosque

import httpx
import os
from timezonefinder import TimezoneFinder
from datetime import datetime
from zoneinfo import ZoneInfo

tf = TimezoneFinder()

async def get_coordinates(place_name: str) -> dict:
    """
    Convert place name to lat/lon/timezone using Google Maps Geocoding API.
    Returns: {lat, lon, timezone_str, utc_offset, formatted_address}
    """
    api_key = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not api_key:
        raise ValueError(
            "Google Maps API key is not configured. Set GOOGLE_MAPS_API_KEY in your environment for geocoding."
        )
    url = "https://maps.googleapis.com/maps/api/geocode/json"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params={"address": place_name, "key": api_key})
        data = response.json()

    status = data.get("status")
    if status and status != "OK":
        raise ValueError(f"Geocoding failed ({status}): {data.get('error_message', place_name)}")

    if not data.get("results"):
        raise ValueError(f"Place not found: {place_name}")

    result = data["results"][0]
    lat = result["geometry"]["location"]["lat"]
    lon = result["geometry"]["location"]["lng"]
    formatted = result.get("formatted_address", "")

    timezone_str = tf.timezone_at(lat=lat, lng=lon) or "UTC"
    tz = ZoneInfo(timezone_str)
    now = datetime.now(tz)
    # Snapshot offset at *request time* (legacy clients only). Birth JD uses IANA zone + birth clock via chart.julian_day_local_birth — not this field.
    utc_offset = now.utcoffset().total_seconds() / 3600

    return {
        "lat": lat,
        "lon": lon,
        "timezone_str": timezone_str,
        "utc_offset": utc_offset,
        "formatted_address": formatted,
    }


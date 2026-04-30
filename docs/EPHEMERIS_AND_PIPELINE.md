# Ephemeris and computation pipeline

## Swiss Ephemeris (`pyswisseph`)

Planetary longitudes and latitudes for chart computation come from **Swiss Ephemeris**, the same family of routines used across serious astrology software. Given identical inputs (UTC time, location, ayanamsa mode), outputs match reference tooling up to documented floating-point tolerance.

## Ayanamsa

Default pathway in Chetya follows **Lahiri (Chitra paksha)** unless your deployment pins another routine in `calculations/ayanamsa.py` / chart builder. Changing ayanamsa shifts **all** sidereal longitudes; treat it as a product-wide configuration decision, not a per-user toggle unless you build that explicitly.

## Time and timezone

- Birth **clock time** is interpreted in the resolved **IANA timezone** from coordinates (`timezonefinder` + `zoneinfo`).
- DST and historical offsets depend on the timezone database on the host; exotic historical births may need manual verification.

## Houses / Lagna

House cusp logic follows whatever `calculations/chart.py` encodes (often whole-sign or a fixed mode via Swiss Ephemeris / flatlib usage — confirm in code before documenting externally). If you publish marketing claims (“equal house”), ensure they match the implementation.

## Validation checklist for engineers

1. Same birth data → same JSON chart snapshot across runs (deterministic).
2. Spot-check Moon longitude against Swiss Ephemeris desktop reference for the same UTC instant.
3. Dasha boundaries: compare first few periods against a trusted Vimshottari table for the same nakshatra entry.

## Known limits

- Birth-time errors disproportionately affect divisionals and dasha fine boundaries.
- Extreme polar latitudes can stress house systems; confirm behaviour if you target those users.

"""Validácia a čítanie lokálnej snímky; tento modul nekontaktuje ArcGIS."""

import hashlib
import json
import math
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SNAPSHOT_NAME = "brownfields_2022.geojson"
MANIFEST_NAME = "brownfields_2022.manifest.json"
SOURCE_URL = (
    "https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/"
    "BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8"
)
# Veľkorysý regionálny ochranný rámec v stupňoch, nie hranica mesta.
REGION_BOUNDS = (16.8, 47.9, 17.4, 48.4)


class DataValidationError(ValueError):
    """Neúplné alebo neplatné údaje sa nesmú dostať do mapy."""


def reject_nonfinite(value: str):
    raise DataValidationError(f"Nepovolená JSON hodnota: {value}")


def parse_json(raw: bytes):
    return json.loads(raw, parse_constant=reject_nonfinite)


def validate_collection(data: object, expected_count: int | None = None) -> set[int]:
    """Základná štruktúra, identita a geometria; nejde o topologický GIS audit."""
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        raise DataValidationError("Očakáva sa GeoJSON FeatureCollection.")
    features = data.get("features")
    if not isinstance(features, list):
        raise DataValidationError("Chýba zoznam features.")
    if expected_count is not None and len(features) != expected_count:
        raise DataValidationError("Počet prvkov nesúhlasí s počtom zdroja.")
    ids: set[int] = set()
    for feature in features:
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise DataValidationError("Neplatný GeoJSON Feature.")
        properties = feature.get("properties")
        if not isinstance(properties, dict):
            raise DataValidationError("Chýbajú properties.")
        oid = properties.get("OBJECTID")
        if type(oid) is not int or oid in ids:
            raise DataValidationError("OBJECTID musí byť jedinečné celé číslo.")
        ids.add(oid)
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict) or geometry.get("type") not in ("Polygon", "MultiPolygon"):
            raise DataValidationError(f"OBJECTID {oid}: očakáva sa Polygon alebo MultiPolygon.")
        coordinates = geometry.get("coordinates")
        polygons = [coordinates] if geometry["type"] == "Polygon" else coordinates
        if not isinstance(polygons, list) or not polygons:
            raise DataValidationError(f"OBJECTID {oid}: prázdna geometria.")
        for polygon in polygons:
            if not isinstance(polygon, list) or not polygon:
                raise DataValidationError(f"OBJECTID {oid}: chýbajú kruhy polygónu.")
            for ring in polygon:
                if not isinstance(ring, list) or len(ring) < 4:
                    raise DataValidationError(f"OBJECTID {oid}: kruh musí mať aspoň 4 pozície.")
                for position in ring:
                    if not isinstance(position, list) or len(position) not in (2, 3):
                        raise DataValidationError("Neplatná pozícia GeoJSON.")
                    if any(type(n) not in (int, float) or not math.isfinite(n) for n in position):
                        raise DataValidationError("Súradnice musia byť konečné čísla.")
                    lon, lat = position[:2]
                    west, south, east, north = REGION_BOUNDS
                    if not (west <= lon <= east and south <= lat <= north):
                        raise DataValidationError(f"OBJECTID {oid}: súradnice mimo regionálneho rámca.")
                if ring[0] != ring[-1] or len({tuple(p[:2]) for p in ring}) < 3:
                    raise DataValidationError(f"OBJECTID {oid}: neuzavretý alebo degenerovaný kruh.")
                area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:]))
                if area == 0:
                    raise DataValidationError(f"OBJECTID {oid}: kruh má nulovú plochu.")
    return ids


def read_snapshot(directory: Path) -> tuple[bytes, dict]:
    raw = (directory / SNAPSHOT_NAME).read_bytes()
    manifest = parse_json((directory / MANIFEST_NAME).read_bytes())
    if not isinstance(manifest, dict):
        raise DataValidationError("Neplatný manifest.")
    count = manifest.get("feature_count")
    if type(count) is not int or count < 0:
        raise DataValidationError("Manifest neobsahuje platný počet.")
    if manifest.get("edition") != "2022" or manifest.get("source_url") != SOURCE_URL:
        raise DataValidationError("Neočakávaný pôvod alebo edícia snímky.")
    if hashlib.sha256(raw).hexdigest() != manifest.get("sha256"):
        raise DataValidationError("Kontrolný súčet snímky nesúhlasí.")
    validate_collection(parse_json(raw), count)
    return raw, manifest


class SnapshotStore:
    """Pamäť poslednej platnej kópie aj počas výmeny dvoch súborov importérom."""

    def __init__(self, directory: Path = DATA_DIR):
        self.directory = directory
        self._signature = None
        self._last_valid: tuple[bytes, dict] | None = None
        self._lock = Lock()

    def get(self) -> tuple[bytes, dict]:
        with self._lock:
            try:
                signature = tuple(
                    (p.stat().st_mtime_ns, p.stat().st_size)
                    for p in (self.directory / SNAPSHOT_NAME, self.directory / MANIFEST_NAME)
                )
                if signature != self._signature or self._last_valid is None:
                    candidate = read_snapshot(self.directory)
                    self._last_valid = candidate
                    self._signature = signature
            except (OSError, ValueError):
                if self._last_valid is None:
                    raise DataValidationError("Platná lokálna snímka nie je dostupná.") from None
            assert self._last_valid is not None
            return self._last_valid

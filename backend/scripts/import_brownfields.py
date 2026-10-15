"""Spustenie z backend/: .venv/Scripts/python.exe -m scripts.import_brownfields."""

import hashlib
import json
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.brownfields import (
    DATA_DIR, MANIFEST_NAME, SNAPSHOT_NAME, SOURCE_URL,
    DataValidationError, parse_json, validate_collection,
)

FIELDS = (
    "OBJECTID", "SPEC_CISLO", "NAZOV", "ADRESA", "MC", "VYMERA_HA",
    "PR_VYU_POP", "N_FUNK_POP", "ZAMER", "DRUH_VLA", "NKP_NAZOV",
    "SEZ_POPIS", "ZONA_OZNACENIE",
)
SERVICE_ITEM_URL = "https://www.arcgis.com/sharing/rest/content/items/7b4eaa49abcf4e32b0a4162eaa3004e1"
RESEARCH_REFERENCE_COUNT = 113  # Len porovnávací údaj zo správy; nie validačný limit.


def fetch_json(url: str) -> dict:
    """HTTP, JSON aj ArcGIS chyby sú chyby importu, nie prázdne datasety."""
    request = Request(url, headers={"User-Agent": "BratislavaUrbanDataExplorer/0.1 (local portfolio research)"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=40) as response:
                raw = response.read(25_000_001)
            if len(raw) > 25_000_000:
                raise DataValidationError("Odpoveď prekročila bezpečnostný limit 25 MB.")
            data = parse_json(raw)
            if not isinstance(data, dict) or "error" in data:
                raise DataValidationError(f"ArcGIS nevrátil platné údaje: {data.get('error') if isinstance(data, dict) else 'JSON'}")
            return data
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise DataValidationError(f"HTTP chyba zdroja: {error.code}") from error
            retry_after = error.headers.get("Retry-After", "") if error.headers else ""
            if retry_after and (not retry_after.isdigit() or int(retry_after) > 30):
                raise DataValidationError("Zdroj žiada dlhšie čakanie; zopakujte import neskôr.") from error
            time.sleep(int(retry_after) if retry_after else 2 ** attempt)
        except (URLError, TimeoutError) as error:
            if attempt == 2:
                raise DataValidationError("Zdroj je sieťovo nedostupný.") from error
            time.sleep(2 ** attempt)
    raise DataValidationError("Import sa nepodaril.")


def query(params: dict) -> tuple[dict, str]:
    url = SOURCE_URL + "/query?" + urlencode(params)
    return fetch_json(url), url


def download() -> tuple[dict, dict]:
    metadata = fetch_json(SOURCE_URL + "?f=json")
    if not set(FIELDS).issubset({f["name"] for f in metadata.get("fields", [])}):
        raise DataValidationError("Schéma zdroja sa zmenila: chýbajú požadované polia.")
    count_response, count_url = query({"where": "1=1", "returnCountOnly": "true", "f": "json"})
    expected = count_response.get("count")
    if type(expected) is not int or expected < 0:
        raise DataValidationError("Zdroj neposkytol platný počet.")
    id_response, ids_url = query({"where": "1=1", "returnIdsOnly": "true", "f": "json"})
    ids = id_response.get("objectIds")
    if not isinstance(ids, list) or any(type(oid) is not int for oid in ids):
        raise DataValidationError("Neplatný zoznam OBJECTID.")
    if len(ids) != expected or len(set(ids)) != expected:
        raise DataValidationError("Počet a zoznam OBJECTID nesúhlasia.")
    limit = metadata.get("maxRecordCount", 500)
    if type(limit) is not int or limit <= 0:
        raise DataValidationError("Neplatný limit služby.")
    batch_size = min(limit, 500)
    collection = {"type": "FeatureCollection", "features": []}
    query_urls = []
    for start in range(0, len(ids), batch_size):
        batch, url = query({
            "objectIds": ",".join(map(str, sorted(ids)[start:start + batch_size])),
            "outFields": ",".join(FIELDS), "returnGeometry": "true",
            "outSR": 4326, "f": "geojson",
        })
        if batch.get("exceededTransferLimit"):
            raise DataValidationError("Zdroj skrátil dávku.")
        validate_collection(batch)
        collection["features"].extend(batch["features"])
        query_urls.append(url)
    actual_ids = validate_collection(collection, expected)
    if actual_ids != set(ids):
        raise DataValidationError("Export obsahuje iné OBJECTID než zoznam zdroja.")
    collection["features"].sort(key=lambda feature: feature["properties"]["OBJECTID"])
    final_count, _ = query({"where": "1=1", "returnCountOnly": "true", "f": "json"})
    final_metadata = fetch_json(SOURCE_URL + "?f=json")
    if final_count.get("count") != expected or metadata.get("editingInfo") != final_metadata.get("editingInfo"):
        raise DataValidationError("Zdroj sa počas importu zmenil. Opakujte import.")
    item = fetch_json(SERVICE_ITEM_URL + "?f=json")
    manifest = {
        "source_url": SOURCE_URL, "layer_name": metadata["name"], "layer_id": 8,
        "downloaded_at": datetime.now(timezone.utc).isoformat(), "edition": "2022",
        "feature_count": expected, "source_count": expected,
        "research_reference_count": RESEARCH_REFERENCE_COUNT,
        "difference_from_research": expected - RESEARCH_REFERENCE_COUNT,
        "source_spatial_reference": metadata.get("extent", {}).get("spatialReference"),
        "output_crs": "OGC:CRS84 (WGS 84, longitude/latitude)",
        "editing_info": final_metadata.get("editingInfo"),
        "fields": list(FIELDS), "count_url": count_url, "ids_url": ids_url,
        "query_urls": query_urls,
        "redistribution": "unconfirmed; local use only; do not commit or publish",
        "service_license_info": item.get("licenseInfo", ""),
        "service_item_url": SERVICE_ITEM_URL,
    }
    return collection, manifest


def atomic_write(path: Path, raw: bytes):
    descriptor, name = tempfile.mkstemp(prefix=".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def save_snapshot(data: dict, manifest: dict, directory: Path = DATA_DIR) -> dict:
    validate_collection(data, manifest["feature_count"])
    raw = (json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n").encode("utf-8")
    manifest = {**manifest, "sha256": hashlib.sha256(raw).hexdigest()}
    directory.mkdir(parents=True, exist_ok=True)
    data_path, manifest_path = directory / SNAPSHOT_NAME, directory / MANIFEST_NAME
    previous = {}
    if manifest_path.exists():
        try:
            previous = parse_json(manifest_path.read_bytes())
            if not isinstance(previous, dict):
                previous = {}
        except ValueError:
            # Poškodený starý manifest nesmie zabrániť novému platnému importu.
            previous = {}
    manifest["previous_feature_count"] = previous.get("feature_count")
    manifest["difference_from_previous"] = (
        manifest["feature_count"] - previous["feature_count"]
        if type(previous.get("feature_count")) is int else None
    )
    manifest_raw = (json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
    backups = {p: p.read_bytes() if p.exists() else None for p in (data_path, manifest_path)}
    try:
        atomic_write(data_path, raw)
        atomic_write(manifest_path, manifest_raw)
    except OSError:
        # Obnovíme predchádzajúcu dvojicu pri bežnej chybe zápisu.
        for path, backup in backups.items():
            if backup is not None:
                atomic_write(path, backup)
            else:
                path.unlink(missing_ok=True)
        raise
    return manifest


def main() -> int:
    try:
        data, manifest = download()
        manifest = save_snapshot(data, manifest)
    except (OSError, ValueError) as error:
        print(f"Import zlyhal: {error}", file=sys.stderr)
        return 1
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

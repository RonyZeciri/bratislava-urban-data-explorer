"""Výlučne syntetické testovacie geometrie; nejde o skutočné brownfieldy."""

import asyncio
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse

from app import main
from app.brownfields import (
    DataValidationError, MANIFEST_NAME, SNAPSHOT_NAME, SOURCE_URL,
    SnapshotStore, parse_json, validate_collection,
)
from scripts import import_brownfields as importer


def synthetic_collection(count=1):
    """TEST_ONLY: malé trojuholníky na test algoritmu, nie dáta lokality."""
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature", "id": oid,
            "properties": {"OBJECTID": oid, "NAZOV": None, "MC": "TEST_ONLY"},
            "geometry": {"type": "Polygon", "coordinates": [
                [[17.0, 48.0], [17.001, 48.0], [17.0, 48.001], [17.0, 48.0]]
            ]},
        } for oid in range(1, count + 1)],
    }


def synthetic_manifest(count=1):
    return {"source_url": SOURCE_URL, "edition": "2022", "feature_count": count,
            "layer_name": "TEST_ONLY"}


async def asgi_get(path):
    messages = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    await main.app({
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "GET", "scheme": "http", "path": path, "raw_path": path.encode(),
        "query_string": b"", "root_path": "", "headers": [],
        "server": ("test", 80), "client": ("test", 1),
    }, receive, send)
    start = next(m for m in messages if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return start["status"], dict(start["headers"]), body


class ValidationTests(unittest.TestCase):
    def test_polygon_and_null_attributes_are_kept(self):
        self.assertEqual(validate_collection(synthetic_collection(), 1), {1})

    def test_multipolygon(self):
        data = synthetic_collection()
        geometry = data["features"][0]["geometry"]
        geometry["type"] = "MultiPolygon"
        geometry["coordinates"] = [geometry["coordinates"]]
        self.assertEqual(validate_collection(data, 1), {1})

    def test_count_and_duplicates(self):
        with self.assertRaises(DataValidationError):
            validate_collection(synthetic_collection(), 113)
        data = synthetic_collection(2)
        data["features"][1]["properties"]["OBJECTID"] = 1
        with self.assertRaises(DataValidationError):
            validate_collection(data)

    def test_wrong_collection_and_geometry(self):
        for data in [{}, {"type": "FeatureCollection", "features": None}]:
            with self.subTest(data=data), self.assertRaises(DataValidationError):
                validate_collection(data)
        for geometry in [None, {"type": "Point", "coordinates": [17, 48]},
                         {"type": "Polygon", "coordinates": []}]:
            data = synthetic_collection()
            data["features"][0]["geometry"] = geometry
            with self.subTest(geometry=geometry), self.assertRaises(DataValidationError):
                validate_collection(data)

    def test_unclosed_degenerate_swapped_and_nonfinite_coordinates(self):
        invalid_rings = [
            [[17, 48], [17.01, 48], [17, 48.01], [17.02, 48]],
            [[17, 48]] * 4,
            [[48, 17], [48.01, 17], [48, 17.01], [48, 17]],
            [[17, 48], [float('nan'), 48], [17, 48.01], [17, 48]],
        ]
        for ring in invalid_rings:
            data = synthetic_collection()
            data["features"][0]["geometry"]["coordinates"] = [ring]
            with self.subTest(ring=ring), self.assertRaises(DataValidationError):
                validate_collection(data)

    def test_nonstandard_json_and_empty_collection(self):
        with self.assertRaises(DataValidationError):
            parse_json(b'{"value":NaN}')
        self.assertEqual(validate_collection(synthetic_collection(0), 0), set())


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)

    def test_hash_and_last_known_valid_snapshot(self):
        manifest = importer.save_snapshot(synthetic_collection(), synthetic_manifest(), self.directory)
        store = SnapshotStore(self.directory)
        raw, _ = store.get()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), manifest["sha256"])
        (self.directory / SNAPSHOT_NAME).write_text('{}')
        self.assertEqual(store.get()[0], raw)
        with self.assertRaises(DataValidationError):
            SnapshotStore(self.directory).get()

    def test_invalid_import_does_not_replace_valid_snapshot(self):
        importer.save_snapshot(synthetic_collection(), synthetic_manifest(), self.directory)
        original = (self.directory / SNAPSHOT_NAME).read_bytes()
        with self.assertRaises(DataValidationError):
            importer.save_snapshot(synthetic_collection(), synthetic_manifest(2), self.directory)
        self.assertEqual((self.directory / SNAPSHOT_NAME).read_bytes(), original)

    def test_valid_import_can_repair_corrupt_manifest(self):
        (self.directory / MANIFEST_NAME).write_text('broken JSON')
        importer.save_snapshot(synthetic_collection(), synthetic_manifest(), self.directory)
        raw, _ = SnapshotStore(self.directory).get()
        self.assertEqual(len(json.loads(raw)['features']), 1)

    def test_write_error_restores_previous_pair(self):
        importer.save_snapshot(synthetic_collection(), synthetic_manifest(), self.directory)
        original = {p: p.read_bytes() for p in self.directory.iterdir()}
        real_write = importer.atomic_write
        calls = 0

        def failing_second_write(path, raw):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError('TEST_ONLY simulated write failure')
            return real_write(path, raw)

        with patch.object(importer, 'atomic_write', side_effect=failing_second_write):
            with self.assertRaises(OSError):
                importer.save_snapshot(synthetic_collection(2), synthetic_manifest(2), self.directory)
        self.assertEqual({p: p.read_bytes() for p in self.directory.iterdir()}, original)

    def test_api_returns_geojson_without_network(self):
        importer.save_snapshot(synthetic_collection(), synthetic_manifest(), self.directory)
        with patch.object(main, 'snapshot_store', SnapshotStore(self.directory)), \
             patch('urllib.request.urlopen', side_effect=AssertionError('API must not use network')):
            status, headers, body = asyncio.run(asgi_get('/api/brownfields'))
        self.assertEqual(status, 200)
        self.assertIn(b'application/geo+json', headers[b'content-type'])
        self.assertEqual(headers[b'x-data-edition'], b'2022')
        self.assertEqual(json.loads(body)['features'][0]['properties']['OBJECTID'], 1)

    def test_api_missing_and_corrupt_snapshot(self):
        for corrupt in [False, True]:
            if corrupt:
                (self.directory / SNAPSHOT_NAME).write_text('{}')
                (self.directory / MANIFEST_NAME).write_text('{}')
            with self.subTest(corrupt=corrupt), patch.object(main, 'snapshot_store', SnapshotStore(self.directory)):
                status, _, body = asyncio.run(asgi_get('/api/brownfields'))
                self.assertEqual(status, 503)
                self.assertIn('Snímka', json.loads(body)['detail'])

    def test_health_unchanged(self):
        status, _, body = asyncio.run(asgi_get('/api/health'))
        self.assertEqual((status, json.loads(body)), (200, {'status': 'ok'}))


class ImportTests(unittest.TestCase):
    def source(self, url):
        params = parse_qs(urlparse(url).query)
        if url.startswith(importer.SERVICE_ITEM_URL):
            return {'licenseInfo': ''}
        if '/query' not in url:
            return {'name': 'TEST_ONLY', 'maxRecordCount': 1, 'editingInfo': {'lastEditDate': 1},
                    'fields': [{'name': field} for field in importer.FIELDS]}
        if 'returnCountOnly' in params:
            return {'count': 2}
        if 'returnIdsOnly' in params:
            return {'objectIds': [2, 1]}
        ids = [int(oid) for oid in params['objectIds'][0].split(',')]
        all_features = synthetic_collection(2)
        all_features['features'] = [f for f in all_features['features'] if f['properties']['OBJECTID'] in ids]
        return all_features

    def test_batches_and_dynamic_count(self):
        with patch.object(importer, 'fetch_json', side_effect=self.source):
            data, manifest = importer.download()
        self.assertEqual(len(data['features']), 2)
        self.assertEqual(manifest['source_count'], 2)
        self.assertEqual(len(manifest['query_urls']), 2)
        self.assertEqual(manifest['difference_from_research'], 2 - 113)

    def test_source_changes_during_download(self):
        count_calls = 0

        def changing_source(url):
            nonlocal count_calls
            data = self.source(url)
            if 'returnCountOnly' in url:
                count_calls += 1
                if count_calls == 2:
                    return {'count': 3}
            return data

        with patch.object(importer, 'fetch_json', side_effect=changing_source):
            with self.assertRaises(DataValidationError):
                importer.download()

    def test_http_and_arcgis_errors_are_not_empty_datasets(self):
        with patch.object(importer, 'urlopen', side_effect=HTTPError('https://test', 403, 'Forbidden', None, None)):
            with self.assertRaisesRegex(DataValidationError, 'HTTP'):
                importer.fetch_json('https://test')
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"error":{"code":499}}'
        with patch.object(importer, 'urlopen', return_value=response):
            with self.assertRaisesRegex(DataValidationError, 'ArcGIS'):
                importer.fetch_json('https://test')


if __name__ == '__main__':
    unittest.main()

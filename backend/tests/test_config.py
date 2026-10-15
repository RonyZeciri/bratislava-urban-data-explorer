"""Konfigurácia a skutočné ASGI požiadavky; žiadny prístup k reálnym GIS dátam."""

import asyncio
import json
import unittest
from unittest.mock import patch

from app.config import ConfigurationError, read_settings
from app.main import create_app


async def request(app, path="/api/health", method="GET", headers=()):
    messages = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    await app({
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": method, "scheme": "https", "path": path, "raw_path": path.encode(),
        "query_string": b"", "root_path": "", "headers": list(headers),
        "server": ("test", 443), "client": ("test", 1),
    }, receive, send)
    start = next(m for m in messages if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return start["status"], dict(start["headers"]), body


class ConfigurationTests(unittest.TestCase):
    def test_development_and_production_defaults(self):
        self.assertTrue(read_settings({}).snapshot_api_enabled)
        production = read_settings({"APP_ENV": "production"})
        self.assertFalse(production.snapshot_api_enabled)
        self.assertEqual(production.cors_allowed_origins, ())

    def test_boolean_parsing_and_explicit_override(self):
        for value, expected in [("true", True), ("false", False), (" FALSE ", False), ("TRUE", True)]:
            with self.subTest(value=value):
                self.assertEqual(read_settings({"APP_ENV": "production", "SNAPSHOT_API_ENABLED": value}).snapshot_api_enabled, expected)
        for value in ["", "0", "1", "yes", "no", "null"]:
            with self.subTest(value=value), self.assertRaisesRegex(ConfigurationError, "SNAPSHOT_API_ENABLED"):
                read_settings({"SNAPSHOT_API_ENABLED": value})

    def test_invalid_environment_stops_creation(self):
        for value in ["", "prod", "Production"]:
            with self.subTest(value=value), self.assertRaisesRegex(ConfigurationError, "APP_ENV"):
                read_settings({"APP_ENV": value})
        with patch.dict("os.environ", {"APP_ENV": "invalid"}, clear=True):
            with self.assertRaises(ConfigurationError):
                create_app()

    def test_json_origin_list_is_strict_and_deduplicated(self):
        settings = read_settings({"APP_ENV": "production", "CORS_ALLOWED_ORIGINS": '["https://ui.example.com","https://ui.example.com"]'})
        self.assertEqual(settings.cors_allowed_origins, ("https://ui.example.com",))
        for value in ['', '*', 'null', '{}', '"https://ui.example.com"', '[1]', '[true]', '[null]']:
            with self.subTest(value=value), self.assertRaisesRegex(ConfigurationError, "CORS_ALLOWED_ORIGINS"):
                read_settings({"CORS_ALLOWED_ORIGINS": value})

    def test_unsafe_or_non_https_production_origins_are_rejected(self):
        for value in ['*', 'https://*.example.com', 'http://ui.example.com', 'null',
                      'https://user:TEST_ONLY@ui.example.com', 'https://ui.example.com/',
                      'https://ui.example.com/path', 'https://ui.example.com?x=1',
                      'https://ui.example.com#x', 'https://ui.example.com:99999',
                      'https://ui.example.com\\path', ' https://ui.example.com']:
            with self.subTest(value=value), self.assertRaises(ConfigurationError):
                read_settings({"APP_ENV": "production", "CORS_ALLOWED_ORIGINS": json.dumps([value])})
        dev = read_settings({"CORS_ALLOWED_ORIGINS": '["http://127.0.0.1:5173"]'})
        self.assertEqual(dev.cors_allowed_origins, ("http://127.0.0.1:5173",))


class ProductionApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(read_settings({
            "APP_ENV": "production", "CORS_ALLOWED_ORIGINS": '["https://ui.example.com"]',
        }))

    def test_production_snapshot_disabled_before_reading_any_copy(self):
        with patch('app.main.snapshot_store.get', side_effect=AssertionError('TEST_ONLY: must not read')):
            status, headers, body = asyncio.run(request(self.app, '/api/brownfields', headers=[(b'origin', b'https://ui.example.com')]))
        self.assertEqual(status, 503)
        self.assertIn('zakázané', json.loads(body)['detail'])
        self.assertEqual(headers[b'cache-control'], b'no-store')
        self.assertEqual(headers[b'access-control-allow-origin'], b'https://ui.example.com')
        self.assertNotIn(b'x-feature-count', headers)

    def test_explicit_development_disable_also_blocks_snapshot(self):
        app = create_app(read_settings({"SNAPSHOT_API_ENABLED": "false"}))
        with patch('app.main.snapshot_store.get', side_effect=AssertionError('TEST_ONLY')):
            self.assertEqual(asyncio.run(request(app, '/api/brownfields'))[0], 503)

    def test_health_and_allowed_origin_without_credentials(self):
        status, headers, body = asyncio.run(request(self.app, headers=[(b'origin', b'https://ui.example.com')]))
        self.assertEqual((status, json.loads(body)), (200, {'status': 'ok'}))
        self.assertEqual(headers[b'access-control-allow-origin'], b'https://ui.example.com')
        self.assertIn(b'Origin', headers[b'vary'])
        self.assertNotIn(b'access-control-allow-credentials', headers)

    def test_other_origins_do_not_get_cors_permission(self):
        for origin in [b'https://evil.example.com', b'http://ui.example.com', b'null', b'https://ui.example.com.evil.test']:
            status, headers, _ = asyncio.run(request(self.app, headers=[(b'origin', origin)]))
            self.assertEqual(status, 200)  # CORS nie je autentifikácia verejného GET.
            self.assertNotIn(b'access-control-allow-origin', headers)

    def test_preflight_allows_only_get_and_safe_headers(self):
        base = [(b'origin', b'https://ui.example.com')]
        status, headers, _ = asyncio.run(request(self.app, method='OPTIONS', headers=base + [(b'access-control-request-method', b'GET')]))
        self.assertEqual(status, 200)
        self.assertEqual(headers[b'access-control-allow-methods'], b'GET')
        self.assertNotIn(b'access-control-allow-credentials', headers)
        for extra in [[(b'access-control-request-method', b'POST')],
                      [(b'access-control-request-method', b'GET'), (b'access-control-request-headers', b'authorization')]]:
            self.assertEqual(asyncio.run(request(self.app, method='OPTIONS', headers=base + extra))[0], 400)

    def test_default_empty_allowlist_grants_nothing(self):
        app = create_app(read_settings({"APP_ENV": "production"}))
        _, headers, _ = asyncio.run(request(app, headers=[(b'origin', b'https://ui.example.com')]))
        self.assertNotIn(b'access-control-allow-origin', headers)


if __name__ == '__main__':
    unittest.main()

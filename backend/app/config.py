"""Malá konfigurácia z prostredia; chyby zastavia štart pred obsluhou požiadaviek."""

import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import urlsplit


class ConfigurationError(ValueError):
    """Neplatná konfigurácia aplikácie (bez vypisovania jej hodnôt)."""


@dataclass(frozen=True)
class Settings:
    app_env: str
    cors_allowed_origins: tuple[str, ...]
    snapshot_api_enabled: bool


def read_settings(environ: Mapping[str, str] | None = None) -> Settings:
    env = os.environ if environ is None else environ
    app_env = env.get("APP_ENV", "development")
    if app_env not in ("development", "production"):
        raise ConfigurationError("APP_ENV musí byť development alebo production.")

    raw_enabled = env.get("SNAPSHOT_API_ENABLED")
    if raw_enabled is None:
        enabled = app_env == "development"
    elif raw_enabled.strip().lower() in ("true", "false"):
        enabled = raw_enabled.strip().lower() == "true"
    else:
        raise ConfigurationError("SNAPSHOT_API_ENABLED musí byť true alebo false.")

    try:
        origins = json.loads(env.get("CORS_ALLOWED_ORIGINS", "[]"))
    except (ValueError, TypeError) as error:
        raise ConfigurationError("CORS_ALLOWED_ORIGINS musí byť JSON zoznam originov.") from error
    if not isinstance(origins, list) or any(not isinstance(origin, str) for origin in origins):
        raise ConfigurationError("CORS_ALLOWED_ORIGINS musí byť JSON zoznam reťazcov.")
    for origin in origins:
        try:
            url = urlsplit(origin)
            valid = (
                origin == origin.strip() and not any(c.isspace() for c in origin)
                and not any(c in origin for c in ("*", "\\", "?", "#"))
                and url.scheme in (("https",) if app_env == "production" else ("http", "https"))
                and bool(url.hostname) and url.username is None and url.password is None
                and not url.path and not url.query and not url.fragment
                and (url.port is None or 1 <= url.port <= 65535)
            )
        except ValueError:
            valid = False
        if not valid:
            raise ConfigurationError(
                "CORS_ALLOWED_ORIGINS vyžaduje presné originy bez wildcard, "
                "prihlasovacích údajov, cesty a koncovej lomky; v produkcii iba HTTPS."
            )
    return Settings(app_env, tuple(dict.fromkeys(origins)), enabled)

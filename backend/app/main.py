"""Vstupný bod API. Spustenie: python -m uvicorn app.main:app --reload."""

from fastapi import FastAPI
from fastapi import HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.brownfields import DataValidationError, SnapshotStore
from app.config import Settings, read_settings

snapshot_store = SnapshotStore()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = read_settings() if settings is None else settings
    application = FastAPI(
        title="Bratislava Urban Data Explorer API",
        description="Backend portfóliového projektu pre skúmanie mestských dát.",
        version="0.1.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_allowed_origins),
        allow_credentials=False,
        allow_methods=["GET"],
    )

    @application.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        """Potvrdí beh API, nie dostupnosť dát."""
        return {"status": "ok"}

    @application.get("/api/brownfields", tags=["brownfields"], response_class=Response)
    def brownfields() -> Response:
        """Zakázaný režim nikdy nečíta snímku ani poslednú platnú kópiu."""
        if not settings.snapshot_api_enabled:
            raise HTTPException(
                status_code=503,
                detail="Poskytovanie lokálnej GIS snímky je v tejto konfigurácii zakázané.",
                headers={"Cache-Control": "no-store"},
            )
        try:
            raw, manifest = snapshot_store.get()
        except DataValidationError as error:
            raise HTTPException(
                status_code=503,
                detail="Snímka brownfieldov nie je dostupná. Spustite lokálny import podľa README.",
            ) from error
        return Response(
            content=raw,
            media_type="application/geo+json",
            headers={
                "ETag": f'"{manifest["sha256"]}"',
                "Cache-Control": "private, no-cache",
                "X-Data-Edition": "2022",
                "X-Feature-Count": str(manifest["feature_count"]),
            },
        )
    return application


app = create_app()

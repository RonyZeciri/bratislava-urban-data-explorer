"""Vstupný bod API. Spustenie: python -m uvicorn app.main:app --reload."""

from fastapi import FastAPI
from fastapi import HTTPException, Response

from app.brownfields import DataValidationError, SnapshotStore

snapshot_store = SnapshotStore()

app = FastAPI(
    title="Bratislava Urban Data Explorer API",
    description="Backend portfóliového projektu pre skúmanie mestských dát.",
    version="0.1.0",
)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Potvrdí, že API beží a dokáže odpovedať na požiadavku."""
    return {"status": "ok"}


@app.get("/api/brownfields", tags=["brownfields"], response_class=Response)
def brownfields() -> Response:
    """Vráti poslednú validovanú lokálnu snímku bez sieťového volania."""
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

"""Vstupný bod API. Spustenie: python -m uvicorn app.main:app --reload."""

from fastapi import FastAPI

app = FastAPI(
    title="Bratislava Urban Data Explorer API",
    description="Backend portfóliového projektu pre skúmanie mestských dát.",
    version="0.1.0",
)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Potvrdí, že API beží a dokáže odpovedať na požiadavku."""
    return {"status": "ok"}

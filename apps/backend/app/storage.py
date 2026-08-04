import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "submissions")

_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def _ext_for(content_type: str, filename: str | None) -> str:
    return _EXTENSION_BY_CONTENT_TYPE.get(content_type) or Path(filename or "").suffix or ""


def _get_container_client():
    """Lazily import/construct the Blob container client.

    Import is deferred so a local dev environment without azure-storage-blob's
    native dependencies installed can still run the local-disk fallback below.
    """
    from azure.storage.blob import BlobServiceClient

    service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    return service_client.get_container_client(AZURE_STORAGE_CONTAINER)


def save_submission_media(file: UploadFile) -> str:
    """Persist an uploaded photo/video and return a URL it can be fetched from.

    Uploads to Azure Blob Storage when AZURE_STORAGE_CONNECTION_STRING is set
    (returning Blob's own absolute https:// URL); otherwise falls back to
    local disk under UPLOAD_DIR (returning a relative /media/... path), which
    keeps local development working exactly as before with no Azure account.
    """
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise ValueError(f"Unsupported media type: {content_type or 'unknown'}")

    filename = f"{uuid.uuid4().hex}{_ext_for(content_type, file.filename)}"
    data = file.file.read()

    if AZURE_STORAGE_CONNECTION_STRING:
        from azure.storage.blob import ContentSettings

        container = _get_container_client()
        container.upload_blob(
            name=filename,
            data=data,
            content_settings=ContentSettings(content_type=content_type),
        )
        return container.get_blob_client(filename).url

    dest = UPLOAD_DIR / filename
    with dest.open("wb") as out:
        out.write(data)
    return f"/media/{filename}"

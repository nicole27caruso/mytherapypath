import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "submissions")
AZURE_STORAGE_LIBRARY_CONTAINER = os.getenv("AZURE_STORAGE_LIBRARY_CONTAINER", "exercise-library")

MAX_EXERCISE_VIDEO_BYTES = 100 * 1024 * 1024  # 100MB cap for therapist-uploaded library videos

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


def _get_container_client(container_name: str = AZURE_STORAGE_CONTAINER):
    """Lazily import/construct the Blob container client.

    Import is deferred so a local dev environment without azure-storage-blob's
    native dependencies installed can still run the local-disk fallback below.
    """
    from azure.storage.blob import BlobServiceClient

    service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    return service_client.get_container_client(container_name)


def _persist(data: bytes, content_type: str, filename: str | None, container_name: str = AZURE_STORAGE_CONTAINER) -> str:
    """Write already-validated media bytes to Blob Storage (or local disk) and return its URL."""
    blob_name = f"{uuid.uuid4().hex}{_ext_for(content_type, filename)}"

    if AZURE_STORAGE_CONNECTION_STRING:
        from azure.storage.blob import ContentSettings

        container = _get_container_client(container_name)
        container.upload_blob(
            name=blob_name,
            data=data,
            content_settings=ContentSettings(content_type=content_type),
        )
        return container.get_blob_client(blob_name).url

    dest = UPLOAD_DIR / blob_name
    with dest.open("wb") as out:
        out.write(data)
    return f"/media/{blob_name}"


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

    data = file.file.read()
    return _persist(data, content_type, file.filename)


def save_exercise_video(file: UploadFile) -> str:
    """Persist a therapist-uploaded exercise library video, capped at MAX_EXERCISE_VIDEO_BYTES.

    Stored in its own container/prefix (exercise-library) so library content
    is distinguishable from client progress-photo submissions.
    """
    content_type = file.content_type or ""
    if not content_type.startswith("video/"):
        raise ValueError(f"Unsupported video type: {content_type or 'unknown'}")

    data = file.file.read()
    if len(data) > MAX_EXERCISE_VIDEO_BYTES:
        raise ValueError(f"Video exceeds the {MAX_EXERCISE_VIDEO_BYTES // (1024 * 1024)}MB upload limit")

    return _persist(data, content_type, file.filename, container_name=AZURE_STORAGE_LIBRARY_CONTAINER)

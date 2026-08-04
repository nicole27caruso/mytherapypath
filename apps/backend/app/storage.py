import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
}


def save_submission_media(file: UploadFile) -> str:
    """Persist an uploaded photo/video to disk and return its `/media/...` path."""
    content_type = file.content_type or ""
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise ValueError(f"Unsupported media type: {content_type or 'unknown'}")

    ext = _EXTENSION_BY_CONTENT_TYPE.get(content_type) or Path(file.filename or "").suffix or ""
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as out:
        out.write(file.file.read())
    return f"/media/{filename}"

"""Tesseract OCR wrapper for lesson screenshots."""
from io import BytesIO
from typing import Tuple

import pytesseract
from PIL import Image


def extract_text(image_bytes: bytes) -> Tuple[str, float]:
    """Run Tesseract on raw image bytes.

    Returns (full_text, mean_confidence in [0.0, 1.0]).
    """
    image = Image.open(BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")

    full_text = pytesseract.image_to_string(image)

    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    confs = [int(c) for c in data.get("conf", []) if c not in (None, "-1") and str(c).strip() not in ("", "-1")]
    confidence = (sum(confs) / len(confs) / 100.0) if confs else 0.0

    return full_text, round(confidence, 3)

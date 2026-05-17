"""Lesson screenshot extraction endpoint.

POST /api/extract-lesson-screenshot
  multipart: file=<image>
  returns:   LessonExtractionResult
"""
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import LessonExtractionResult
from app.services.heuristics import parse_domains
from app.services.ocr import extract_text

router = APIRouter()


@router.post("/extract-lesson-screenshot", response_model=LessonExtractionResult)
async def extract_lesson_screenshot(file: UploadFile = File(...)) -> LessonExtractionResult:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file upload")

    try:
        raw_text, confidence = extract_text(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failure: {e}") from e

    domain1, domain2, domain3, post_observation, warnings = parse_domains(raw_text)

    return LessonExtractionResult(
        ocr_raw_text=raw_text,
        confidence=confidence,
        domain1=domain1,
        domain2=domain2,
        domain3=domain3,
        post_observation=post_observation,
        warnings=warnings,
    )

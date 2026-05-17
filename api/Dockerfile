FROM python:3.12-slim

WORKDIR /app

# System deps: tesseract for OCR + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      tesseract-ocr \
      tesseract-ocr-eng \
      libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[dev]"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

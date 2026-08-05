FROM python:3.11-slim

# System deps for OCR (Tesseract), OpenCV, and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libgl1 \
        libglib2.0-0 \
        poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --timeout=180 --retries=5 -r /app/requirements.txt

# Application code lives under backend/praxis; add it to the path.
COPY backend /app/backend
COPY data /app/data
ENV PYTHONPATH=/app/backend

RUN groupadd -r praxis && useradd -r -g praxis -d /app praxis \
    && chown -R praxis:praxis /app
USER praxis

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

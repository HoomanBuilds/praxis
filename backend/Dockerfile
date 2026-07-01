FROM python:3.11-slim

# System deps for OCR (Tesseract) and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libgl1 \
        libglib2.0-0 \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Application code lives under backend/praxis; add it to the path.
COPY backend /app/backend
COPY data /app/data
ENV PYTHONPATH=/app/backend

EXPOSE 8080

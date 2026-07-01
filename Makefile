.PHONY: install seed index health run api worker test docker clean

PY=PYTHONPATH=backend .venv/bin/python
UVICORN=PYTHONPATH=backend .venv/bin/uvicorn

install:
	python3 -m venv .venv && .venv/bin/pip install -U pip && .venv/bin/pip install -r requirements.txt

seed:
	.venv/bin/python data/seed/build_pdfs.py

index:
	$(PY) -m cli index-corpus

health:
	$(PY) -m cli health

# Run the full pipeline on one circular: make run DOC=data/corpus/cyber_security.pdf
DOC?=data/corpus/margin_pledge.pdf
run:
	$(PY) -m cli run $(DOC) --auto-approve

api:
	$(UVICORN) api.main:app --reload --port 8080

worker:
	$(PY) -m ingestion.worker

test:
	$(PY) -m pytest backend/tests -q

docker:
	docker compose up --build

clean:
	rm -f data/praxis.db && rm -rf data/chroma data/exports data/documents

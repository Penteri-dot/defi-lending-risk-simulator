PYTHON := .venv/bin/python
PIP    := .venv/bin/pip

.PHONY: install run test

install:
	/opt/homebrew/bin/python3.13 -m venv .venv
	$(PIP) install -q -r requirements.txt

run:
	.venv/bin/uvicorn backend.main:app --reload --port 8000

test:
	.venv/bin/pytest backend/tests/ -v

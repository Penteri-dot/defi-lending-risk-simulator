PYTHON := .venv/bin/python
PIP    := .venv/bin/pip

.PHONY: install run test

install:
	@python3 -c "import sys; v=sys.version_info; sys.exit(0) if v>=(3,10) else (print('Error: Python 3.10+ required, found '+'.'.join(str(x) for x in v[:3])) or sys.exit(1))"
	python3 -m venv .venv
	$(PIP) install -q -r requirements.txt

run:
	.venv/bin/uvicorn backend.main:app --reload --port 8000

test:
	.venv/bin/pytest backend/tests/ -v

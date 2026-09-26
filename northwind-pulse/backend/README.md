# Backend

Requires Python 3.10+; initialization was verified with Python 3.10.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health
Interactive API documentation: http://localhost:8000/docs

No environment variables are required. This service starts independently of the frontend.
Only `/health` is implemented. pandas is installed for later dataset analysis.

Backend development stays inside this directory. See `../docs/API_CONTRACT.md` and
`../docs/ARCHITECTURE.md` before implementing product endpoints.

`requirements.in` records direct dependency constraints. `requirements.txt` pins the
resolved dependencies; install it for a reproducible environment. When deliberately
upgrading, use a clean virtual environment, install `requirements.in`, verify the
service, then regenerate `requirements.txt` with `python -m pip freeze`.

# End-to-end tests

Basic Selenium tests that drive the app in a real browser. They expect the
app to already be running (e.g. via `docker compose up`) with the frontend
reachable at `http://localhost:3000`.

## Setup

```
pip install -r e2e/requirements.txt
```

Requires a local Chrome/Chromium install. Selenium Manager (bundled with
Selenium 4.6+) downloads a matching chromedriver automatically.

## Running

```
pytest e2e
```

Override the target URL or run with a visible browser via env vars:

```
E2E_BASE_URL=http://localhost:3000 E2E_HEADLESS=0 pytest e2e
```

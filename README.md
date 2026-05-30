# D&D Interactive Maps

An interactive map application for Dungeons & Dragons campaigns. 
Built with React (TypeScript), Django/GraphQL, and PostgreSQL, 
containerized with Docker.

## Features
- Interactive map viewing and editing
- Support for Underdark and Elturel maps (easily extensible to more)
- Edit mode for dungeon masters
- AI-powered map analysis agent to detect missing or mismatched location pins

## Tech Stack
- **Frontend:** React, TypeScript
- **Backend:** Django, GraphQL (Strawberry/Graphene)
- **Database:** PostgreSQL
- **Infrastructure:** Docker, Docker Compose

---

## Testing the App

## 🌐 View in Browser

Open your web browser and navigate to:

**Frontend (Main App):** http://localhost:3000

**Backend API/GraphQL:** http://localhost:8000

## 📋 Step-by-Step Instructions

### Prerequisites

- Docker Desktop installed and running
- Copy `.env.example` to `.env` and fill in the values:
```
cp backend/.env.example backend/.env
```
- Then edit `backend/.env` with your actual `DB_PASSWORD`, `SECRET_KEY`, etc.

### Starting the App (Dev)

Running the frontend natively (outside Docker) avoids WSL2 overhead and filesystem
polling lag on Windows. Keep the backend and database in Docker, run Vite locally.

**Terminal 1 — backend + database:**
```
docker compose up db backend
```

Wait until you see:
- `database system is ready to accept connections` (database ready)
- `Watching for file changes with StatReloader` (backend ready)

**Terminal 2 — frontend:**
```
cd frontend
npm run dev
```

Then open **http://localhost:3000** in your browser.

### Stopping the App

Press **Ctrl+C** in both terminals, then tear down the Docker services:
```
docker compose down
```

### Rebuilding after dependency changes

Only needed if you've changed `requirements.txt` or a Dockerfile:
```
docker compose up db backend --build
```

## Running Tests

### Frontend Tests
To run frontend tests (React/TypeScript with Jest):
```
cd frontend
npm test
```

### Backend Tests
To run backend tests (Django with PostgreSQL):
1. Ensure the app is running: `docker-compose up --build`
2. Run tests: `docker-compose exec backend python manage.py test`

## 🤖 Map Locations Agent

The `analyze_map` management command uses Claude vision to scan a map image, compare
identified locations against database pins, and report (or auto-create) missing entries.

### Basic usage
```
docker compose exec backend python manage.py analyze_map --map underdark
```

### Options
| Flag              | Description                                                              |
|-------------------|--------------------------------------------------------------------------|
| `--map`           | Map slug to analyze (`underdark`, `elturel`, …). Default: `underdark`    |
| `--threshold`     | Normalised distance tolerance for matching pins (default: `0.06`)        |
| `--display-width` | Viewport width used when pins were created (default: native image width) |
| `--create-pins`   | Write missing locations to the database                                  |
| `--create-issues` | Post a GitHub issue for each inconsistency found                         |
| `--image-path`    | Override the path to the map image                                       |

### Restoring pins from the fixture
If the database is ever wiped, restore all location pins with:
```
docker compose exec backend python manage.py loaddata mapdata/fixtures/locations.json
```

### Exporting pins to the fixture
After adding new pins (via Edit Mode or `--create-pins`), export them for CI:
```
docker compose exec backend python manage.py dumpdata mapdata.location --indent 2 > backend/mapdata/fixtures/locations.json
```
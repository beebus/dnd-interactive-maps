# D&D Interactive Maps

An interactive map application for Dungeons & Dragons campaigns. 
Built with React (TypeScript), Django/GraphQL, and PostgreSQL, 
containerized with Docker.

## Features
- Interactive map viewing and editing
- Support for Underdark and Elturel maps
- Edit mode for dungeon masters

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

### Starting the App

1. **Make sure Docker Desktop is running**

2. **Open Command Prompt or PowerShell** and navigate to your project:
   ```
   cd C:\Users\beebs\PycharmProjects\dnd-interactive-maps
   ```

3. **Start all services** with Docker Compose:
   ```
   docker-compose up --build
   ```

4. **Wait for all services to start** – you'll see messages like:
   - `database system is ready to accept connections` (Database ready)
   - `Watching for file changes with StatReloader` (Backend ready)
   - `webpack compiled successfully` or `Compiled successfully!` (Frontend ready)

5. **Open your browser** to:
   - **http://localhost:3000** – to view the React app

### Stopping the App

Press **Ctrl+C** in the terminal where docker-compose is running, then run:
```
docker-compose down
```

### Starting the App (After First Build)

After the first build, you can start faster without rebuilding:
```
docker-compose up
```

Only use `--build` if you've changed dependencies or Dockerfiles.

## Running Tests

### Frontend Tests
To run frontend tests (React/TypeScript with Jest):
```
docker-compose exec frontend npm test
```

### Backend Tests
To run backend tests (Django with PostgreSQL):
1. Ensure the app is running: `docker-compose up --build`
2. Run tests: `docker-compose exec backend python manage.py test`
# Investe Bem Brasil

A full-stack wealth-management platform that brings financial automation, real-time investment monitoring, and an explainable AI layer together to help investors and advisors make better decisions.

## What It Does

- **Unified dashboard** — transactions, budgets, goals, portfolio and alerts in a single React + Tailwind experience.
- **Specialized backends**
  - **Express + SQLite** (Node.js) for transactional operations, Socket.IO streaming and API-key authentication.
  - **FastAPI + SQLModel** (Python) for intelligent monitoring, quantitative metrics and Gemini-powered insights.
- **Explainable AI** — a finance chat with an educational fallback, automatic insights and alert explanations.
- **Security built in** — rate limiting, Zod validation, structured logging (Pino) and a secure proxy in front of the AI service.

## Key Capabilities

- Financial dashboard with a consolidated view of income, expenses, goals and portfolio.
- CSV statement import with automatic sanitization.
- Budgets, goals and investments with status calculation, history and alerts.
- Price streaming (Socket.IO) synchronized with real FastAPI metrics.
- AI insights and a finance chat powered by Google Gemini through the Python backend.

## Tech Stack

| Layer | Technologies | Responsibilities |
| ----- | ------------ | ---------------- |
| Front end | Vite, React 18, TypeScript, shadcn/ui, React Query | Responsive UI, data orchestration, Socket.IO integration |
| Express API | Express 5, better-sqlite3, Socket.IO, Zod | Financial CRUDs, CSV import, API-key authentication, portfolio streaming |
| FastAPI API | FastAPI, SQLModel, Pandas, Gemini | Market data collection, quantitative metrics, rebalancing and AI insights |
| Persistence | Shared SQLite (`backend/app/db/investebem.db`) | Transactional and monitoring data in a single file (WAL enabled) |

## Operational Security

- Every Express route requires `x-api-key` (or `Authorization: Bearer`) using `SERVER_API_KEY`.
- Rate limiting (120 req/min) and Helmet are enabled by default.
- Zod validation prevents inconsistent input.
- Structured logs with Pino and `pino-pretty` in development mode.
- The front end never reaches Gemini directly; everything goes through the secure proxy.

## Requirements

- Node.js >= 18 and npm >= 9
- Python >= 3.11
- (Optional) Docker and Docker Compose

## Quick Setup

```bash
npm install
cp .env.example .env
cp server/.env.example server/.env
cp backend/.env.example backend/.env
```

1. Set a secure key (>= 16 characters) for `SERVER_API_KEY` and mirror it in `VITE_SERVER_API_KEY`.
2. Adjust `SQLITE_PATH` if you want to store the database somewhere else.
3. Fill in `GEMINI_API_KEY` in the FastAPI `.env` to enable AI features.

### Relevant variables

| Variable | Context | Description |
| -------- | ------- | ----------- |
| `SERVER_API_KEY` | Express | Required key for every route (sent via `x-api-key`). |
| `VITE_SERVER_API_KEY` | Front end | Used to populate the header automatically. |
| `VITE_API_URL` / `VITE_SOCKET_URL` | Front end | Endpoints for REST and Socket.IO (default `http://localhost:4000`). |
| `FASTAPI_BASE_URL` | Express | URL used to delegate intelligent calls (`http://localhost:8000/api/v1`). |
| `GEMINI_API_KEY` | FastAPI | Google Gemini key used in the AI flows. |

## Running Locally

### FastAPI backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Express backend

```bash
npm run server
```

Express and FastAPI share the SQLite database at `backend/app/db/investebem.db`. Adjust `SQLITE_PATH` if needed.

### Vite front end

```bash
npm run dev
```

The interface is available at `http://localhost:5173`.

### Integrated run (Docker Compose)

```bash
SERVER_API_KEY=change-this-key docker compose up --build
```

Exposed services:

- `frontend` -> `http://localhost:5173`
- `api` (Express + Socket.IO) -> `http://localhost:4000`
- `fastapi` -> `http://localhost:8000`

`shared-db` is the named volume that syncs SQLite across the containers.

## API Access

Example of an authenticated call:

```bash
curl -H "x-api-key: Rn77sv5rxZMkhHRz" http://localhost:4000/api/transactions
```

Without the header the server responds with `{"message":"Unauthorized request"}`.

Useful tools:

- Postman/Insomnia: set `x-api-key` in the headers.
- Browser console:
  ```js
  fetch('http://localhost:4000/api/transactions', {
    headers: { 'x-api-key': 'your-key' },
  }).then(r => r.json()).then(console.log);
  ```

## Quality and Observability

| Command | Description |
| ------- | ----------- |
| `npm run lint` | ESLint covering the front end and backend |
| `npm run test` | Vitest + Supertest with V8 coverage |
| `npm run build` | Production build of the front end |

- CI (`.github/workflows/ci.yml`) runs lint, tests and build on pushes/PRs.
- Rate limiting, Helmet and structured logs are active by default.

## Suggested Roadmap

- Per-user/per-client authentication with permission control.
- Full observability (Prometheus + Grafana) and alarms.
- Integration with Open Finance providers and banking APIs.
- Public SDK and partner documentation.

## Support and Contributing

1. Open an issue describing the context, logs and steps to reproduce.
2. Before submitting a PR, run `npm run lint && npm run test`.
3. Use the `.env.example` files as a configuration reference.

---

A project geared toward intelligent financial planning, with a focus on auditing, security and collaboration between technology and investment teams.

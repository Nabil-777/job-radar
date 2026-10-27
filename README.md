# 🎯 JobRadar v2.0 — AI-Powered Tech Job & Internship Intelligence Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/SQLite-WAL%20Mode-blue.svg)](https://www.sqlite.org/)
[![Security](https://img.shields.io/badge/Security-Helmet%20%7C%20Rate%20Limit-orange.svg)](https://helmetjs.github.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1%20Swagger-85EA2D.svg)](http://localhost:4000/api/docs)

**JobRadar v2.0** is an enterprise-grade Tech Career Intelligence and Recruitment Automation Platform tailored for Morocco and Global/Remote tech talent. It aggregates tech internships (Stage PFE / Pré-embauche), junior roles, and remote engineering positions across **19+ major job portals and custom RSS/JSON feeds**, scores every listing against candidate CV profiles using a **0–100% AI Matching Engine**, and automates application outreach.

---

## 🌟 What's New in v2.0

* **💾 Production SQLite Storage (WAL Mode):** Replaced fragile JSON files with high-concurrency SQLite (`better-sqlite3`) utilizing Write-Ahead Logging (`WAL`), 5000ms busy timeout, and atomic transactions. Schema includes `jobs`, `applications`, `user_profile`, `custom_providers`, and `provider_health`.
* **🤖 0–100% AI Candidate Matching Engine:** Weighted heuristic scoring (50% skill overlap, 25% seniority fit, 25% location/remote preference) with extracted keyword badges (`Matched Skills`, `Missing Skills`).
* **📄 PDF CV Parser & Auto-Profile Sync:** Upload your resume (PDF) to automatically parse tech stack keywords, education, and target job titles.
* **✍️ 4-in-1 AI Career Application Suite:** Generates tailored Cover Letters, LinkedIn Recruiter connection notes (<300 chars), cold outreach emails, and 3 specific CV alignment suggestions via Gemini, Groq, OpenAI, Ollama, or deterministic template engine.
* **📋 Kanban Application Pipeline:** Drag-and-drop / 1-click status updates across 6 stages (`Saved`, `Applied`, `Technical_Test`, `Interview`, `Offer`, `Rejected`) with **7-day follow-up reminder alerts**.
* **🛡️ Resilient Scraper Architecture:** User-Agent rotation, 8-second request timeouts, cross-board deduplication (`slugify(company)::slugify(title)::slugify(city)`), merged source badges, and circuit-breaker provider health tracking.
* **📈 Observability & Health Matrix:** Live tracking of scraper latency, HTTP status codes, error messages, and cached job counts accessible via UI modal and `/api/providers/health`.
* **⏰ Autonomous Background Radar Cron:** Automatically sweeps job boards every 30 minutes, flags unseen opportunities (`is_new = 1`), and delivers high-match alerts to Discord & Telegram webhooks.
* **⚡ Upgraded CLI v2.0:** Includes `--pfe` shortcut, `--match` AI scoring against saved profile, and `--export csv|json`.
* **📖 Interactive OpenAPI 3.1 & Swagger UI:** Fully documented REST endpoints accessible at `/api/docs`.
* **🐳 Hardened Multi-Stage Docker Build:** Minimal `node:20-slim` runtime image, non-root `node` user execution, persistent volume mounts, and automated health checking.

---

## 💻 System Requirements

Before running JobRadar, ensure your host environment meets the following specifications:

| Requirement | Minimum | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `v20.x LTS` | Requires native `fetch` and `node:test` runner |
| **npm** | `>= 9.0.0` | `v10.x` | Bundled with Node.js |
| **SQLite3** | `v3.35.0+` | Bundled | Managed via `better-sqlite3` native binaries |
| **Docker** (Optional) | `20.10+` | `Latest` | Required only for containerized execution |
| **Docker Compose** (Optional) | `v2.0+` | `Latest` | Standard Docker Compose plugin |
| **C++ Build Tools** (Optional) | `python3`, `make`, `g++` | — | Only required if compiling native bindings from source on uncommon architectures |

---

## 🌐 19+ Built-In Providers & Custom Feeds

| Provider | Focus | Region |
| :--- | :--- | :--- |
| **Jobzyn.com** | Startups, Scale-ups & Modern Tech | 🇲🇦 Morocco |
| **WeTech.ma** | 100% IT, Dev & Cloud Platforms | 🇲🇦 Morocco |
| **Talent.com (Maroc)** | National Job Search Aggregator | 🇲🇦 Morocco |
| **Dreamjob.ma** | Stages, PFE & Concours Public/Privé | 🇲🇦 Morocco |
| **Emploi.ma** | IT, Networks & Technical Support | 🇲🇦 Morocco |
| **Morocco Top ESN Hub** | Capgemini, DXC, CGI, Alten, Inetum, SQLI, Atos, Sofrecom, Oracle Labs | 🇲🇦 Morocco |
| **Rekrute.com** | Corporate IT & Banking PFE Hubs | 🇲🇦 Morocco |
| **Custom Feeds** | User-defined RSS / Atom XML feeds or JSON endpoints | 🌐 Global |
| **GitHub Tech Index / SimplifyJobs** | 2,400+ FAANG / Top Tech Internships (2026, 2025, New Grad) | 🌐 Global / US |
| **Indeed** | Greenhouse, Lever, Workable, BambooHR direct employer links | 🌐 Global |
| **LinkedIn Jobs** | Live Guest scraper for Morocco, Remote, EMEA, Worldwide | 🌐 Global |
| **Relocate.me** | Tech jobs with verified Visa Sponsorship in Europe | 🇪🇺 Europe |
| **Y Combinator (YC)** | Top accelerated tech startups (Work at a Startup) | 🌐 Global / Remote |
| **Himalayas** | Worldwide remote tech positions with visible salaries | 🌐 Global |
| **Jobicy** | Remote software engineering, AI, DevOps | 🌐 Global |
| **WeWorkRemotely** | Largest remote developer & tech community | 🌐 Global |
| **Hacker News (YC)** | Direct founder & CTO hiring posts | 🌐 Global |
| **Remotive** | Curated remote developer & security jobs | 🌐 Global |
| **RemoteOK** | 100% remote tech jobs | 🌐 Global |
| **Arbeitnow** | European tech jobs with English speaking teams | 🇪🇺 Europe |

---

## 🚀 Step-by-Step Installation

### Method 1: Bare Metal Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Nabil-777/job-radar.git
cd job-radar

# 2. Set up environment configuration
cp .env.example .env

# Edit .env and set a cryptographically secure JWT_SECRET (must be >= 32 characters)
# For example, generate one via:
# openssl rand -hex 32

# 3. Install production and development dependencies
npm ci

# 4. Run the automated test suites
npm test

# 5. Verify OpenAPI documentation specifications
npm run lint:openapi

# 6. Start the server
npm start
```

* **Web UI Dashboard:** [http://localhost:4000](http://localhost:4000)
* **Interactive Swagger UI:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
* **System Health Endpoint:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

### Method 2: Docker & Docker Compose Deployment

JobRadar comes with an optimized multi-stage `Dockerfile` based on `node:20-slim`. Build tools are discarded in the final stage, reducing image size and attack surface. The application runs strictly as an unprivileged non-root user (`USER node`).

```bash
# 1. Clone repository and navigate to folder
git clone https://github.com/Nabil-777/job-radar.git
cd job-radar

# 2. Configure environment variables
cp .env.example .env
# Set JWT_SECRET in .env or pass it as an environment variable

# 3. Build and launch container in detached mode
docker compose up -d --build

# 4. Check running containers and automated healthcheck status
docker compose ps

# 5. Inspect container logs
docker compose logs -f jobradar

# 6. Stop container
docker compose down
```

#### Standalone Docker CLI Run (Without Compose)
```bash
# Build the Docker image
docker build -t jobradar:latest .

# Run container with mounted SQLite data volume and environment variables
docker run -d \
  --name jobradar \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secure-random-32-byte-hex-string" \
  -e CORS_ORIGINS="http://localhost:4000" \
  -v $(pwd)/data:/app/data \
  jobradar:latest
```

---

## 💻 CLI v2.0 Usage

JobRadar includes a command-line interface for headless scraping and batch exports:

```bash
# Search Moroccan PFE Internships with AI Match Scoring against saved profile
node cli.js --pfe --match

# Search React roles from Jobzyn with JSON export
node cli.js --source jobzyn --keywords "React" --export json my_jobs.json

# Search Cybersecurity / SOC roles with CSV export
node cli.js --keywords "Cybersecurity" --match --export csv

# Search ESNs with limit and custom location
node cli.js --source esn-morocco --level internship --location Morocco --limit 10

# View complete CLI manual
node cli.js --help
```

---

## 📡 REST API Reference

JobRadar exposes a structured REST API documented with OpenAPI 3.1. Interactive documentation is live at `/api/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/docs` | Interactive Swagger UI API documentation |
| `GET` | `/api/docs/openapi.json` | OpenAPI 3.1 JSON specification |
| `GET` | `/api/health` | Service uptime and SQLite database health |
| `GET` | `/api/health/scrapers` | Circuit breaker status & latency matrix for scrapers |
| `GET` | `/api/jobs` | Multi-portal search with query filters and match scores |
| `GET` | `/api/providers/health` | Latency, error rates, and job counts for all 19+ providers |
| `GET` | `/api/applications` | List tracked applications in recruitment pipeline |
| `POST` | `/api/applications` | Track a job in the Kanban pipeline |
| `PATCH` | `/api/applications/:id` | Update stage (`Saved`, `Applied`, `Technical_Test`, etc.) |
| `DELETE` | `/api/applications/:id` | Remove tracked application |
| `GET` | `/api/export/applications` | Download applications as a CSV spreadsheet |
| `GET` | `/api/profile` | Retrieve candidate profile and parsed CV skills |
| `POST` | `/api/profile` | Update candidate profile |
| `POST` | `/api/profile/upload-cv` | Upload PDF CV to extract skills and profile fields |
| `POST` | `/api/ai/pitch` | Generate Cover Letter, LinkedIn Note, Cold Email, CV Tips |
| `GET` | `/api/custom-providers` | List active custom RSS / JSON providers |
| `POST` | `/api/custom-providers` | Add a custom RSS or JSON feed |
| `PATCH` | `/api/custom-providers/:id/toggle` | Enable or disable custom feed |
| `DELETE` | `/api/custom-providers/:id` | Remove custom provider |

---

## 🧪 Automated Test Suite & Code Quality

JobRadar includes a full testing suite leveraging Node.js native test runner (`node:test`) and Supertest for HTTP integration tests, alongside `c8` code coverage.

```bash
# Run unit and integration tests (95+ passing tests)
npm test

# Run tests with c8 coverage report
npm run test:coverage

# Validate OpenAPI 3.1 schema specification
npm run lint:openapi
```

**Key Test Suites:**
- `tests/routesAuth.test.js`: Authentication, session verification, rate limits
- `tests/openapiDocs.test.js`: OpenAPI schema validity and Swagger UI endpoint tests
- `tests/aiPromptBuilders.test.js`: AI generation service, prompt injection hardening, credential scanner
- `tests/scraperHealth.test.js`: Scraper health matrix, circuit breaker tripping and recovery
- `tests/fingerprint.test.js`: Cross-board job deduplication & slugification
- `tests/matchingEngine.test.js`: 0–100% heuristic skill matching & keyword extraction
- `tests/database.test.js`: SQLite WAL mode CRUD & Kanban status transitions
- `tests/dateNormalizer.test.js`: Multi-language relative date parsing

---

## 📄 License
MIT © [Nabil-777](https://github.com/Nabil-777)

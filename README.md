# 🎯 JobRadar v2.0 — AI-Powered Tech Job & Internship Intelligence Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/SQLite-WAL%20Mode-blue.svg)](https://www.sqlite.org/)
[![Security](https://img.shields.io/badge/Security-Helmet%20%7C%20Rate%20Limit-orange.svg)](https://helmetjs.github.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**JobRadar v2.0** is an enterprise-grade Tech Career Intelligence and Recruitment Automation Platform tailored for Morocco and Global/Remote tech talent. It aggregates tech internships (Stage PFE / Pré-embauche), junior roles, and remote engineering positions across **19+ major job portals and custom RSS/JSON feeds**, scores every listing against candidate CV profiles using a **0–100% AI Matching Engine**, and automates application outreach.

---

## 🌟 What's New in v2.0

* **💾 Production SQLite Storage (WAL Mode):** Replaced fragile JSON files with high-concurrency SQLite (`better-sqlite3`). Schema includes `jobs`, `applications`, `user_profile`, `custom_providers`, and `provider_health`.
* **🤖 0–100% AI Candidate Matching Engine:** Weighted heuristic scoring (50% skill overlap, 25% seniority fit, 25% location/remote preference) with extracted keyword badges (`Matched Skills`, `Missing Skills`).
* **📄 PDF CV Parser & Auto-Profile Sync:** Upload your resume (PDF) to automatically parse tech stack keywords, education, and target job titles.
* **✍️ 4-in-1 AI Career Application Suite:** Generates tailored Cover Letters, LinkedIn Recruiter connection notes (<300 chars), cold outreach emails, and 3 specific CV alignment suggestions via Gemini, Groq, OpenAI, Ollama, or deterministic template engine.
* **📋 Kanban Application Pipeline:** Drag-and-drop / 1-click status updates across 6 stages (`Saved`, `Applied`, `Technical_Test`, `Interview`, `Offer`, `Rejected`) with **7-day follow-up reminder alerts**.
* **🛡️ Resilient Scraper Architecture:** User-Agent rotation, 8-second request timeouts, cross-board deduplication (`slugify(company)::slugify(title)::slugify(city)`), and merged source badges (`Sources: ReKrute, LinkedIn`).
* **📈 Observability & Health Matrix:** Live tracking of scraper latency, HTTP status codes, error messages, and cached job counts accessible via UI modal and `/api/providers/health`.
* **⏰ Autonomous Background Radar Cron:** Automatically sweeps job boards every 30 minutes, flags unseen opportunities (`is_new = 1`), and delivers high-match alerts to Discord & Telegram webhooks.
* **⚡ Upgraded CLI v2.0:** Includes `--pfe` shortcut, `--match` AI scoring against saved profile, and `--export csv|json`.
* **🐳 Docker & Docker Compose Ready:** Single-command production deployment with volume persistence.

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

## 🚀 Quick Start

### 1. Local Development
```bash
# Clone the repository
git clone https://github.com/Nabil-777/job-radar.git
cd job-radar

# Install dependencies
npm install

# Setup environment configuration
cp .env.example .env

# Run database tests (14 unit tests)
npm test

# Start the server (Port 4000)
npm start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser.

---

### 2. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# View live application logs
docker-compose logs -f
```

---

## 💻 CLI v2.0 Usage

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

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service uptime and SQLite database health |
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

## 🧪 Automated Test Suite

JobRadar includes a native Node.js test runner suite (`node:test`):
```bash
npm test
```
**Test Coverage:**
- `tests/fingerprint.test.js`: Cross-board job deduplication & slugification
- `tests/matchingEngine.test.js`: 0–100% heuristic skill matching & keyword extraction
- `tests/database.test.js`: SQLite WAL mode CRUD & Kanban status transitions
- `tests/dateNormalizer.test.js`: Multi-language relative date parsing

---

## 📄 License
MIT © [Nabil-777](https://github.com/Nabil-777)

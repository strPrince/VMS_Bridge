# VMC Bridge - Backend API

FastAPI backend server for VMC Bridge vulnerability management platform.

## 🚀 Quick Start

### Option 1: Use Root Start Script (Recommended)
```powershell
# From project root - starts backend, worker, and frontend
.\start-all.ps1
```

### Option 2: Run Backend Only

1. **Create & activate virtual environment**
   ```powershell
   # Windows
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   
   # macOS/Linux
   python3.11 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   python -m pip install --upgrade pip setuptools wheel
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   # Copy example and edit with your settings
   cp .env.example .env
   ```
   
   Required environment variables:
   ```env
   DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/vmc_bridge
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=your-super-secure-secret-key-min-32-chars
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

6. **Start background worker** (in separate terminal)
   ```bash
   .\.venv\Scripts\Activate.ps1  # Windows
   python run_worker.py
   ```

## 📡 API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get JWT tokens
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

### Scans
- `POST /scans/upload` - Upload scan file
- `GET /scans` - List all scans (paginated)
- `GET /scans/{scan_id}` - Get scan details
- `DELETE /scans/{scan_id}` - Delete scan

### Vulnerabilities
- `GET /vulnerabilities` - List vulnerabilities (with filters)
- `GET /vulnerabilities/{vuln_id}` - Get vulnerability details
- `PATCH /vulnerabilities/{vuln_id}` - Update vulnerability status
- `POST /vulnerabilities/{vuln_id}/remediation/generate` - Generate and save AI remediation steps

### Jobs
- `GET /jobs` - List background jobs
- `GET /jobs/{job_id}` - Get job status

### Health
- `GET /health` - Health check endpoint

**Interactive API Documentation**: http://127.0.0.1:8000/docs

## 🏗️ Project Structure

```
Backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   ├── routes/          # API route handlers
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── scans.py     # Scan management
│   │   │   ├── vulnerabilities.py
│   │   │   └── jobs.py
│   │   └── schemas.py       # Pydantic models
│   ├── core/
│   │   ├── config.py        # Settings & configuration
│   │   ├── security.py      # JWT & password handling
│   │   ├── queue.py         # Background job queue
│   │   └── parsers/         # Scan file parsers
│   │       ├── base.py
│   │       └── nessus.py
│   └── db/
│       ├── models.py        # SQLAlchemy models
│       ├── session.py       # Database session
│       └── init_db.py       # Database initialization
├── alembic/
│   └── versions/            # Database migrations
├── scripts/
│   ├── worker.py            # Background worker
│   └── test_*.py            # Test scripts
├── tests/                   # Unit & integration tests
├── upload/                  # Uploaded scan files
├── requirements.txt         # Python dependencies
├── alembic.ini             # Alembic configuration
└── run_worker.py           # Worker entry point
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with these variables:

```env
# Application
DEBUG=True
APP_NAME=VMC Bridge API
VERSION=0.1.0

# Database
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/vmc_bridge

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
SECRET_KEY=change-this-to-a-secure-random-32-char-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI remediation generation
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODELS=gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-8b
```

### Generate Secure Secret Key

```python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🗄️ Database

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Database Schema

Key tables:
- `users` - User accounts
- `scans` - Uploaded scan files
- `assets` - Discovered assets (servers, apps)
- `vulnerabilities` - Security findings
- `jobs` - Background processing jobs

## 🔨 Background Worker

The worker processes heavy operations asynchronously:

### Supported Job Types
- `parse_scan` - Parse uploaded scan files
- `jira_creation` - Create JIRA tickets for vulnerabilities
- `ml_analysis` - ML-powered risk analysis (future)
- `report_generation` - Generate PDF reports (future)

### Running the Worker

```bash
python run_worker.py
```

The worker uses Dramatiq + Redis for job processing.

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_parsers.py

# Run with verbose output
pytest -v
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U postgres -d vmc_bridge

# Check if database exists
psql -U postgres -c "\l"

# Create database if missing
psql -U postgres -c "CREATE DATABASE vmc_bridge;"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (Windows - use Redis installer or WSL)
# Start Redis (macOS)
brew services start redis

# Start Redis (Linux)
sudo systemctl start redis
```

### Migration Errors

```bash
# Reset database (WARNING: destroys data)
alembic downgrade base
alembic upgrade head
```

### Import Errors

```bash
# Ensure you're in the Backend directory and venv is activated
cd Backend
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate      # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

### Port Already in Use

```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 8000 (macOS/Linux)
lsof -ti:8000 | xargs kill -9
```

## 📦 Dependencies

Key packages:
- **FastAPI** - Modern web framework
- **SQLAlchemy** - ORM with async support
- **Alembic** - Database migrations
- **Dramatiq** - Background tasks
- **Redis** - Cache & queue
- **Pydantic** - Data validation
- **python-jose** - JWT tokens
- **passlib** - Password hashing
- **uvicorn** - ASGI server

See `requirements.txt` for complete list.

## 🚀 Production Deployment

### Using Gunicorn

```bash
pip install gunicorn

# Run with multiple workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### Environment Setup

1. Set `DEBUG=False` in production
2. Use strong `SECRET_KEY` (32+ characters)
3. Configure proper `DATABASE_URL` for production DB
4. Set up SSL/TLS (HTTPS)
5. Configure CORS for production domain
6. Enable rate limiting
7. Set up monitoring (Sentry, etc.)

See [PRODUCTION_READINESS_CHECKLIST.md](../PRODUCTION_READINESS_CHECKLIST.md) for complete guide.

## 📚 Additional Resources

- [Main README](../README.md) - Overall project documentation
- [Frontend README](../Frontend/README.md) - Frontend setup
- [API Documentation](http://127.0.0.1:8000/docs) - Swagger UI (when running)
- [Production Checklist](../PRODUCTION_READINESS_CHECKLIST.md) - Deployment guide

## 🤝 Contributing

1. Follow PEP 8 style guide
2. Add tests for new features
3. Update API documentation
4. Run tests before committing
5. Use type hints

## 📄 License

MIT License - See LICENSE file for details

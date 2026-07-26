# VMC Bridge

Vulnerability Management & Compliance Bridge - Security scan analysis platform with ML-powered insights.

## 🚀 Quick Start - Run All Services

Open **3 separate terminals** and run:

**Terminal 1 - Backend API:**
```powershell
cd Backend
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate    # macOS/Linux
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Background Worker:**
```powershell
cd Backend
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate    # macOS/Linux
python run_worker.py
```

**Terminal 3 - Frontend:**
```powershell
cd Frontend
npm run dev
```

This starts:
- ✅ Backend API (http://127.0.0.1:8000)
- ✅ Background Worker (Dramatiq)
- ✅ Frontend (http://localhost:5173)

---

## 📋 Prerequisites

- Python 3.11 or 3.12
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

---

## 🛠️ Manual Setup

### 1. Backend Setup

```powershell
cd Backend

# Create virtual environment
py -3.11 -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup

```powershell
cd Frontend
npm install
npm run dev
```

### 3. Background Worker

```powershell
cd Backend
.\.venv\Scripts\Activate.ps1
python run_worker.py
```

---

## 📂 Project Structure

```
VMC_Bridge/
├── Backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config, security, queue
│   │   ├── db/              # Database models & session
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   ├── scripts/             # Utility scripts
│   └── requirements.txt
├── Frontend/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── services/            # API client
│   ├── contexts/            # React contexts
│   └── package.json
├── start-all.ps1           # Start all services (Windows)
└── start-all.sh            # Start all services (macOS/Linux)
```

---

## 🔑 Features

- **Authentication** - JWT-based auth with refresh tokens
- **Scan Upload** - Parse Nessus, JSON, XML security scans
- **Vulnerability Management** - Track and manage findings
- **Background Processing** - Async job queue with Dramatiq
- **Dashboard** - Real-time security metrics
- **Reports** - Detailed vulnerability reports

---

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /scans/upload` - Upload scan file
- `GET /scans` - List scans
- `GET /vulnerabilities` - List vulnerabilities
- `GET /jobs` - List background jobs

Full API docs: http://127.0.0.1:8000/docs (when running)

---

## 🧪 Testing

```powershell
cd Backend
pytest
```

---

## 📚 Documentation

- [Backend README](Backend/README.md)
- [Frontend README](Frontend/README.md)
- [Authentication Guide](README_AUTH.md)
- [Production Checklist](PRODUCTION_READINESS_CHECKLIST.md)

---

## 🔧 Environment Variables

Key variables in `Backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/vmc_bridge
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODELS=gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-8b
```

See `.env.example` for all options.

---

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -U postgres`
- Verify .env has correct DATABASE_URL
- Run migrations: `alembic upgrade head`

### Worker won't start
- Check Redis is running: `redis-cli ping`
- Should return `PONG`

### Frontend build errors
- Delete `node_modules` and run `npm install` again
- Check Node version: `node --version` (need 18+)

### Database connection errors
- Verify credentials in .env
- Check PostgreSQL is accepting connections
- Test connection: `psql $DATABASE_URL`

---

## 📈 Production Deployment

See [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) for complete production deployment guide.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 🙏 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guide above

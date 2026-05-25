# AI Call Audit System

A multi-tenant, business-isolated AI call auditing platform designed for quality assurance and performance monitoring in customer support environments.

---

## 🚀 How to Start the Application Manually

Here are all the terminal commands to start the different parts of the application manually:

### 1. Start Docker Containers (PostgreSQL & RabbitMQ)
Run this command from the **root folder** (`/Users/apple/Documents/AI CALL AUDIT SYSTEM`):
```bash
docker compose up -d
```

### 2. Start the FastAPI Backend
Open a new terminal window, navigate to the `backend` folder, activate the virtual environment, and start the Uvicorn server:
```bash
cd "/Users/apple/Documents/AI CALL AUDIT SYSTEM/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. Start the Vite Frontend
Open a new terminal window, navigate to the `frontend` folder, and start the development server:
```bash
cd "/Users/apple/Documents/AI CALL AUDIT SYSTEM/frontend"
npm run dev
```

### 4. Start the Audio Worker (transcription & diarization)
Open a new terminal window, navigate to the `backend` folder, activate the virtual environment, and run the worker script:
```bash
cd "/Users/apple/Documents/AI CALL AUDIT SYSTEM/backend"
source venv/bin/activate
python workers/audio_worker.py
```

### 5. Start the Evaluation Worker (AI grading)
Open a new terminal window, navigate to the `backend` folder, activate the virtual environment, and run the worker script:
```bash
cd "/Users/apple/Documents/AI CALL AUDIT SYSTEM/backend"
source venv/bin/activate
python workers/eval_worker.py
```

### 6. Ollama
Open a terminal window and run the Ollama server:
```bash
ollama serve
```

---

## 👥 Default Test Credentials (Seeded)
* **Admin:** `admin@acme.com` / `Admin@1234`
* **QA:** `qa@acme.com` / `QA@12345`
* **Agent:** `agent@acme.com` / `Agent@123`

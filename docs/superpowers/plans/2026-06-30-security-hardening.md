# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the Gymformer application by removing hardcoded credentials, restricting CORS access, limiting AI API requests, hiding the database port, and managing files with Git correctly.

**Architecture:** Environment variables will be read from a root `.env` file and passed to Docker containers. The backend will restrict CORS to the frontend domain and enforce request rate limits on sensitive AI-related endpoints using `express-rate-limit`.

**Tech Stack:** Express, Docker Compose, Git, npm, express-rate-limit

---

### Task 1: Initialize Git and Environment Variables Configuration

**Files:**
- Create: `/opt/gym-tracker/.gitignore`
- Create: `/opt/gym-tracker/.env`
- Modify: `/opt/gym-tracker/backend/.env`

- [ ] **Step 1: Create a root .gitignore file**
  Create a `.gitignore` file at the project root `/opt/gym-tracker/.gitignore` to ignore environment files, build outputs, and node dependencies.
  ```gitignore
  # Dependency directories
  node_modules/
  
  # Build outputs
  dist/
  build/
  
  # Environment files
  .env
  .env.local
  backend/.env
  
  # IDE and OS files
  .idea/
  .vscode/
  .DS_Store
  ```

- [ ] **Step 2: Create a root .env file**
  Create `/opt/gym-tracker/.env` to store production secrets.
  ```ini
  GEMINI_API_KEY=your_gemini_api_key_here
  POSTGRES_USER=gymuser
  POSTGRES_PASSWORD=your_db_password_here
  POSTGRES_DB=gymdb
  FRONTEND_ORIGIN=http://localhost:8085
  ```

- [ ] **Step 3: Update backend/.env**
  Modify `/opt/gym-tracker/backend/.env` to only define `DATABASE_URL` using localhost (for direct CLI or Prisma migration commands running on the host), while production variables will come from docker-compose.
  ```ini
  DATABASE_URL="postgresql://gymuser:your_db_password_here@localhost:5432/gymdb?schema=public"
  ```

- [ ] **Step 4: Verify git status ignores secret files**
  Verify that git does not track the newly created `.env` files.
  Run: `git status --ignored`
  Expected: `.env` is listed under ignored files, not tracked files.

---

### Task 2: Update Docker Compose Configuration

**Files:**
- Modify: `/opt/gym-tracker/docker-compose.yml`

- [ ] **Step 1: Clean up docker-compose.yml environment variables and ports**
  Replace hardcoded credentials with environment variables, remove version tag (deprecated), and hide PostgreSQL port from the host network by changing ports to internal exposure.
  Target code in `/opt/gym-tracker/docker-compose.yml`:
  ```yaml
  version: '3.8'

  services:
    gym-db:
      image: postgres:15-alpine
      container_name: gym-db
      restart: unless-stopped
      networks:
        - vault_net
      environment:
        POSTGRES_USER: gymuser
        POSTGRES_PASSWORD: your_db_password_here
        POSTGRES_DB: gymdb
      volumes:
        - db_data:/var/lib/postgresql/data
      ports:
        - "5432:5432"

    gym-backend:
      build:
        context: ./backend
        dockerfile: Dockerfile
      container_name: gym-backend
      restart: unless-stopped
      networks:
        - vault_net
      environment:
        DATABASE_URL: "postgresql://gymuser:your_db_password_here@gym-db:5432/gymdb?schema=public"
        PORT: 5000
        GEMINI_API_KEY: "your_gemini_api_key_here"
      depends_on:
        - gym-db
      expose:
        - "5000"
  ```
  Replacement content:
  ```yaml
  services:
    gym-db:
      image: postgres:15-alpine
      container_name: gym-db
      restart: unless-stopped
      networks:
        - vault_net
      environment:
        POSTGRES_USER: ${POSTGRES_USER}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
        POSTGRES_DB: ${POSTGRES_DB}
      volumes:
        - db_data:/var/lib/postgresql/data
      expose:
        - "5432"

    gym-backend:
      build:
        context: ./backend
        dockerfile: Dockerfile
      container_name: gym-backend
      restart: unless-stopped
      networks:
        - vault_net
      environment:
        DATABASE_URL: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@gym-db:5432/${POSTGRES_DB}?schema=public"
        PORT: 5000
        GEMINI_API_KEY: ${GEMINI_API_KEY}
        FRONTEND_ORIGIN: ${FRONTEND_ORIGIN}
      depends_on:
        - gym-db
      expose:
        - "5000"
  ```

---

### Task 3: Restrict CORS and Add Rate Limiting in Express Backend

**Files:**
- Modify: `/opt/gym-tracker/backend/package.json`
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: Install express-rate-limit**
  Install the rate limiting package in the backend directory.
  Run: `npm install express-rate-limit` inside `/opt/gym-tracker/backend`
  Expected: Package added to `package.json` dependencies.

- [ ] **Step 2: Update CORS configuration in server.ts**
  Restrict CORS to the `FRONTEND_ORIGIN` environment variable.
  Target code in `/opt/gym-tracker/backend/src/server.ts`:
  ```typescript
  app.use(cors());
  ```
  Replacement content:
  ```typescript
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8085';
  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));
  ```

- [ ] **Step 3: Define rate limiters in server.ts**
  Define a general rate limiter for all API endpoints and a stricter rate limiter for AI-related endpoints (recommendations, evaluation, monthly analysis).
  Add at the top level of `/opt/gym-tracker/backend/src/server.ts` (after app.use(express.json())):
  ```typescript
  import rateLimit from 'express-rate-limit';

  // General API rate limiter (e.g., 200 requests per 15 minutes per IP)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiter for AI endpoints (e.g., 10 requests per 5 minutes per IP)
  const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: { error: 'AI limit reached. Please try again after 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);
  ```

- [ ] **Step 4: Attach stricter rate limiter to AI endpoints**
  Attach `aiLimiter` to the following endpoints in `/opt/gym-tracker/backend/src/server.ts`:
  1. `GET /api/goals/recommend`
  2. `POST /api/goals/:id/evaluate`
  3. `POST /api/logs/monthly-analysis`
  4. `POST /api/logs/monthly-analysis/chat`

  Example target:
  ```typescript
  app.get('/api/goals/recommend', async (req: Request, res: Response) => {
  ```
  Example replacement:
  ```typescript
  app.get('/api/goals/recommend', aiLimiter, async (req: Request, res: Response) => {
  ```

- [ ] **Step 5: Verify build success**
  Run: `npm run build` inside `/opt/gym-tracker/backend`
  Expected: Successful compilation without TypeScript errors.

---

### Task 4: Re-deploy and Validate

**Files:**
- None (deployment commands)

- [ ] **Step 1: Re-build and restart Docker containers**
  Run: `docker compose down` inside `/opt/gym-tracker`
  Run: `docker compose up -d --build` inside `/opt/gym-tracker`
  Expected: All containers start successfully and run in the background.

- [ ] **Step 2: Verify application is functional**
  Access the web app at `http://localhost:8085` and verify layout loading, log creations, and AI recommendation features continue to work as expected.

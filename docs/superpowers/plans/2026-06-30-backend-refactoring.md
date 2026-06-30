# Backend Refactoring and Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up and deconstruct the monolithic `server.ts` file by dividing routes, database client, database logic, and AI prompt functions into clean separate files.

**Architecture:** Create modular database connection, AI services, background utilities, and Express Routers. Mount all routes in `server.ts`.

**Tech Stack:** Express, TypeScript, Prisma ORM, Google Generative AI (Gemini)

---

### Task 1: Create Database connection module

**Files:**
- Create: `/opt/gym-tracker/backend/src/prisma.ts`

- [ ] **Step 1: Write prisma.ts**
  Create `/opt/gym-tracker/backend/src/prisma.ts` to export a single instance of `PrismaClient` to avoid circular dependencies:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  export const prisma = new PrismaClient();
  ```

---

### Task 2: Create Generative AI Service

**Files:**
- Create: `/opt/gym-tracker/backend/src/services/aiService.ts`

- [ ] **Step 1: Write aiService.ts**
  Create `/opt/gym-tracker/backend/src/services/aiService.ts` to encapsulate the Gemini Client instance and its prompts:
  - Copy Gemini client initialization (`getAIClient()`).
  - Extract all prompt strings and AI helper functions from `server.ts`.

---

### Task 3: Create Goal Progress Utils

**Files:**
- Create: `/opt/gym-tracker/backend/src/utils/goalHelper.ts`

- [ ] **Step 1: Write goalHelper.ts**
  Create `/opt/gym-tracker/backend/src/utils/goalHelper.ts` containing:
  - `updateGoalsProgress()` helper function extracted from `server.ts`.
  - Ensure it imports `prisma` from `../prisma`.

---

### Task 4: Implement Route Modules

**Files:**
- Create: `/opt/gym-tracker/backend/src/routes/layout.ts`
- Create: `/opt/gym-tracker/backend/src/routes/profile.ts`
- Create: `/opt/gym-tracker/backend/src/routes/goals.ts`
- Create: `/opt/gym-tracker/backend/src/routes/logs.ts`

- [ ] **Step 1: Create layout.ts**
  Move GET/POST `/api/layout` endpoints to `/opt/gym-tracker/backend/src/routes/layout.ts` using `express.Router()`.

- [ ] **Step 2: Create profile.ts**
  Move GET/PUT `/api/profile` endpoints to `/opt/gym-tracker/backend/src/routes/profile.ts`.

- [ ] **Step 3: Create goals.ts**
  Move Goals CRUD and AI evaluate/recommend endpoints to `/opt/gym-tracker/backend/src/routes/goals.ts`. Integrate with `aiService`.

- [ ] **Step 4: Create logs.ts**
  Move Logs CRUD, monthly report, and chat endpoints to `/opt/gym-tracker/backend/src/routes/logs.ts`. Integrate with `goalHelper` and `aiService`.

---

### Task 5: Refactor server.ts

**Files:**
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: Rewrite server.ts**
  Deconstruct the massive `server.ts` into a lightweight bootstrap entrypoint:
  - Import Express and standard middlewares (CORS, Rate Limiter).
  - Import the routers (`layout.ts`, `profile.ts`, `goals.ts`, `logs.ts`).
  - Mount routers using `app.use('/api/...', router)`.
  - Keep the server port listener bootstrapper.

---

### Task 6: Build, Run, and Validate

**Files:**
- None (compilation & deployment)

- [ ] **Step 1: Verify TypeScript compilation**
  Run: `npm run build` in `/opt/gym-tracker/backend`
  Expected: Builds successfully with zero TypeScript compilation errors.

- [ ] **Step 2: Rebuild Docker containers**
  Run: `docker compose down && docker compose up -d --build` in `/opt/gym-tracker`
  Expected: Containers rebuild and start successfully.

- [ ] **Step 3: Test API status**
  Expected: Frontend runs fine, layout saves, logs insert and trigger toasts, AI coach generates goals and analyses, and tables are paginated.

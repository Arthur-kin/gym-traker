# Docker Build Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Docker build context size and enforce deterministic dependency installation using `.dockerignore` and `npm ci`.

**Architecture:** We will place `.dockerignore` files in backend/frontend context roots and replace `npm install` with `npm ci` in their respective `Dockerfile`s.

**Tech Stack:** Docker, Docker Compose, npm, Git

---

### Task 1: Create .dockerignore Files

**Files:**
- Create: `/opt/gym-tracker/backend/.dockerignore`
- Create: `/opt/gym-tracker/frontend/.dockerignore`

- [ ] **Step 1: Create backend .dockerignore**
  Create `/opt/gym-tracker/backend/.dockerignore` with the following content:
  ```
  node_modules
  dist
  build
  .env
  .env.*
  *.log
  .git
  .gitignore
  .dockerignore
  ```

- [ ] **Step 2: Create frontend .dockerignore**
  Create `/opt/gym-tracker/frontend/.dockerignore` with the same content:
  ```
  node_modules
  dist
  build
  .env
  .env.*
  *.log
  .git
  .gitignore
  .dockerignore
  ```

---

### Task 2: Modify Dockerfiles to use npm ci

**Files:**
- Modify: `/opt/gym-tracker/backend/Dockerfile`
- Modify: `/opt/gym-tracker/frontend/Dockerfile`

- [ ] **Step 1: Update backend Dockerfile**
  Replace `RUN npm install` with `RUN npm ci` in `/opt/gym-tracker/backend/Dockerfile`.
  Target code around line 10:
  ```dockerfile
  RUN npm install
  ```
  Replacement content:
  ```dockerfile
  RUN npm ci
  ```

- [ ] **Step 2: Update frontend Dockerfile**
  Replace `RUN npm install` with `RUN npm ci` in `/opt/gym-tracker/frontend/Dockerfile`.
  Target code around line 8:
  ```dockerfile
  RUN npm install
  ```
  Replacement content:
  ```dockerfile
  RUN npm ci
  ```

---

### Task 3: Build and Validate

**Files:**
- None (deployment commands)

- [ ] **Step 1: Restart Docker containers with rebuild**
  Run: `docker compose down && docker compose up -d --build` inside `/opt/gym-tracker`
  Expected: Containers successfully rebuild (using cache where appropriate, and using `npm ci`) and run in the background.

- [ ] **Step 2: Verify container status**
  Run: `docker compose ps` inside `/opt/gym-tracker`
  Expected: All containers status is `Up`.

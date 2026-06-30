# Backend Refactoring and Modularization Design

## Goal
Deconstruct the monolithic `server.ts` (~1160 lines) into a highly modular, maintainable, and clean backend structure. Introduce a central Prisma connection file to prevent circular dependencies, extract AI configurations and prompts into a service module, isolate goals background arithmetic, and group REST endpoints into separate router files.

## Directory Structure
```
backend/src/
├── prisma.ts              # Database Client singleton instance
├── services/
│   └── aiService.ts       # AI Gemini Client configurations and prompts helper
├── utils/
│   └── goalHelper.ts      # UpdateGoalsProgress helper database operations
├── routes/
│   ├── layout.ts          # Gym Layout API Router
│   ├── logs.ts            # Workout Logs and AI Analysis Router
│   ├── profile.ts         # User Profile API Router
│   └── goals.ts           # Goals & Challenges and AI Recommendations Router
└── server.ts              # Server bootstrapper and routing mount center
```

---

## Detailed Specifications

### 1. Database connection (`prisma.ts`)
Creates a single instance of `PrismaClient` to be used globally across all router files:
```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

### 2. Generative AI Service (`services/aiService.ts`)
Extracts Google Generative AI configurations and prompt engineering strings. Exposes:
- `recommendGoals(profile, historyLogs)`
- `evaluateGoalFeasibility(goal, profile)`
- `generateMonthlyReport(logs, yearMonth, model)`
- `chatWithCoach(stats, feedback, history, message, model)`

### 3. Background Goal Progress Logic (`utils/goalHelper.ts`)
Isolates the async progress updater `updateGoalsProgress()` so it can be invoked cleanly by logs creation/edit events.

### 4. Modular Routers (`routes/*.ts`)
Each router file defines endpoints for a specific domain using `express.Router()`:
- `routes/layout.ts` handles:
  - `GET /api/layout`
  - `POST /api/layout`
- `routes/profile.ts` handles:
  - `GET /api/profile`
  - `PUT /api/profile`
- `routes/goals.ts` handles:
  - `GET /api/goals`
  - `POST /api/goals`
  - `PUT /api/goals/:id`
  - `DELETE /api/goals/:id`
  - `GET /api/goals/recommend`
  - `POST /api/goals/:id/evaluate`
- `routes/logs.ts` handles:
  - `GET /api/logs`
  - `POST /api/logs`
  - `PUT /api/logs/:id`
  - `DELETE /api/logs/:id`
  - `POST /api/logs/monthly-analysis`
  - `POST /api/logs/monthly-analysis/chat`

### 5. Server Bootstrapper (`server.ts`)
Initializes Express middlewares (body parser, CORS, rate limiter), mounts the modular routers under `/api`, exports the app instance for testing, and boots the port listener.

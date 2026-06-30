# Performance Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Gymformer database query speeds, improve CPU efficiency of progress updates, and conserve server memory by avoiding redundant AI client initializations.

**Architecture:** We will add indices to relations and queried fields in Prisma, rewrite the progress aggregation logic to run in a single pass O(M) and update goals in parallel, and create a singleton AI client module helper.

**Tech Stack:** Prisma, PostgreSQL, Express, TypeScript, Google Generative AI SDK

---

### Task 1: Add Database Indexes in Schema

**Files:**
- Modify: `/opt/gym-tracker/backend/prisma/schema.prisma`

- [ ] **Step 1: Add indices to PlacedEquipment, WorkoutLog, WorkoutSet, and Goal models**
  Modify `/opt/gym-tracker/backend/prisma/schema.prisma` to add `@@index` annotations.
  Target code in `schema.prisma`:
  ```prisma
  // 放置在畫布上的器材實例
  model PlacedEquipment {
    id           String       @id @default(uuid())
    layoutId     String
    layout       GymLayout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
    type         String       // 例如: POWER_RACK, BENCH_PRESS, DUMBBELLS, TREADMILL, CABLE_MACHINE, LAT_PULLDOWN, ROW_MACHINE, KETTLEBELLS
    customName   String       // 使用者自訂名稱
    muscleGroup  String       // 主要訓練肌群: CHEST, BACK, LEGS, SHOULDERS, ARMS, CORE, CARDIO
    gridX        Int          // 畫布中的 X 座標
    gridY        Int          // 畫布中的 Y 座標
    rotation     Int          // 旋轉角度 (0, 90, 180, 270)
    createdAt    DateTime     @default(now())
    logs         WorkoutLog[]
  }

  // 訓練紀錄
  model WorkoutLog {
    id          String          @id @default(uuid())
    equipmentId String
    equipment   PlacedEquipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
    loggedAt    DateTime        @default(now()) // 記錄時間
    sets        WorkoutSet[]
    notes       String?
  }

  // 每一組的詳細重量與次數
  model WorkoutSet {
    id           String     @id @default(uuid())
    logId        String
    log          WorkoutLog @relation(fields: [logId], references: [id], onDelete: Cascade)
    setNumber    Int        // 第幾組 (1, 2, 3...)
    weight       Float      // 重量 (kg 或 lbs)
    reps         Int        // 次數
    rpe          Int?       // 自覺強度 (1-10)
    incline      Float?     // 有氧坡度 (%)
    resistance   Int?       // 有氧阻力段數 (Level)
    heartRate    Int?       // 有氧平均心率 (BPM)
  }

  // 訓練目標與挑戰
  model Goal {
    id           String   @id @default(uuid())
    title        String   // 目標/挑戰名稱，例如：「深蹲突破 100 kg」、「本週有氧跑步 10 km」
    type         String   // "GOAL" (長期目標) 或 "CHALLENGE" (短期挑戰)
    metricType   String   // 進度追蹤指標: "VOLUME" (總量), "DISTANCE" (距離), "DURATION" (時間), "WEIGHT_MAX" (最大重量), "CUSTOM" (純手動勾選)
    targetValue  Float    // 目標值
    currentValue Float    @default(0) // 目前累計值
    unit         String   // 單位，例如: "kg", "km", "minutes", "times"
    deadline     String?  // 截止日期 (格式: YYYY-MM-DD)
    isCompleted  Boolean  @default(false)
    aiFeedback   String?  // 儲存 AI Coach 對此目標的評估反饋
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }
  ```

  Replacement content (add `@@index` lines):
  ```prisma
  // 放置在畫布上的器材實例
  model PlacedEquipment {
    id           String       @id @default(uuid())
    layoutId     String
    layout       GymLayout    @relation(fields: [layoutId], references: [id], onDelete: Cascade)
    type         String       // 例如: POWER_RACK, BENCH_PRESS, DUMBBELLS, TREADMILL, CABLE_MACHINE, LAT_PULLDOWN, ROW_MACHINE, KETTLEBELLS
    customName   String       // 使用者自訂名稱
    muscleGroup  String       // 主要訓練肌群: CHEST, BACK, LEGS, SHOULDERS, ARMS, CORE, CARDIO
    gridX        Int          // 畫布中的 X 座標
    gridY        Int          // 畫布中的 Y 座標
    rotation     Int          // 旋轉角度 (0, 90, 180, 270)
    createdAt    DateTime     @default(now())
    logs         WorkoutLog[]

    @@index([layoutId])
  }

  // 訓練紀錄
  model WorkoutLog {
    id          String          @id @default(uuid())
    equipmentId String
    equipment   PlacedEquipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
    loggedAt    DateTime        @default(now()) // 記錄時間
    sets        WorkoutSet[]
    notes       String?

    @@index([equipmentId])
    @@index([loggedAt])
  }

  // 每一組的詳細重量與次數
  model WorkoutSet {
    id           String     @id @default(uuid())
    logId        String
    log          WorkoutLog @relation(fields: [logId], references: [id], onDelete: Cascade)
    setNumber    Int        // 第幾組 (1, 2, 3...)
    weight       Float      // 重量 (kg 或 lbs)
    reps         Int        // 次數
    rpe          Int?       // 自覺強度 (1-10)
    incline      Float?     // 有氧坡度 (%)
    resistance   Int?       // 有氧阻力段數 (Level)
    heartRate    Int?       // 有氧平均心率 (BPM)

    @@index([logId])
  }

  // 訓練目標與挑戰
  model Goal {
    id           String   @id @default(uuid())
    title        String   // 目標/挑戰名稱，例如：「深蹲突破 100 kg」、「本週有氧跑步 10 km」
    type         String   // "GOAL" (長期目標) 或 "CHALLENGE" (短期挑戰)
    metricType   String   // 進度追蹤指標: "VOLUME" (總量), "DISTANCE" (距離), "DURATION" (時間), "WEIGHT_MAX" (最大重量), "CUSTOM" (純手動勾選)
    targetValue  Float    // 目標值
    currentValue Float    @default(0) // 目前累計值
    unit         String   // 單位，例如: "kg", "km", "minutes", "times"
    deadline     String?  // 截止日期 (格式: YYYY-MM-DD)
    isCompleted  Boolean  @default(false)
    aiFeedback   String?  // 儲存 AI Coach 對此目標的評估反饋
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@index([isCompleted, metricType])
  }
  ```

---

### Task 2: Optimize Goals Progress Calculation and DB Write Complexity

**Files:**
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: Replace updateGoalsProgress function implementation**
  Optimize nested loops and batch writes in `updateGoalsProgress`.
  Target code in `/opt/gym-tracker/backend/src/server.ts:1050-1137`:
  ```typescript
  async function updateGoalsProgress(): Promise<void> {
    try {
      const activeGoals = await prisma.goal.findMany({
        where: {
          isCompleted: false,
          metricType: { not: 'CUSTOM' }
        }
      });

      if (activeGoals.length === 0) {
        return;
      }

      // Include equipment to identify CARDIO vs STRENGTH logs
      const logs = await prisma.workoutLog.findMany({
        include: {
          sets: true,
          equipment: true
        }
      });

      for (const goal of activeGoals) {
        let currentValue = 0;

        if (goal.metricType === 'VOLUME') {
          for (const log of logs) {
            const isCardio = log.equipment?.muscleGroup === 'CARDIO';
            // Volume applies only to non-cardio (strength) training
            if (!isCardio && log.sets) {
              for (const set of log.sets) {
                const weight = set.weight || 0;
                const reps = set.reps || 0;
                currentValue += weight * reps;
              }
            }
          }
        } else if (goal.metricType === 'DISTANCE') {
          for (const log of logs) {
            const isCardio = log.equipment?.muscleGroup === 'CARDIO';
            // Cardio logs store distance (km) in the 'weight' field
            if (isCardio && log.sets) {
              for (const set of log.sets) {
                currentValue += set.weight || 0;
              }
            }
          }
        } else if (goal.metricType === 'DURATION') {
          for (const log of logs) {
            const isCardio = log.equipment?.muscleGroup === 'CARDIO';
            // Cardio logs store duration (minutes) in the 'reps' field
            if (isCardio && log.sets) {
              for (const set of log.sets) {
                currentValue += set.reps || 0;
              }
            }
          }
        } else if (goal.metricType === 'WEIGHT_MAX') {
          let maxWeight = 0;
          for (const log of logs) {
            const isCardio = log.equipment?.muscleGroup === 'CARDIO';
            // Max weight applies only to strength training
            if (!isCardio && log.sets) {
              for (const set of log.sets) {
                if (set.weight !== undefined && set.weight !== null) {
                  if (set.weight > maxWeight) {
                    maxWeight = set.weight;
                  }
                }
              }
            }
          }
          currentValue = maxWeight;
        }

        const isCompleted = currentValue >= goal.targetValue;

        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            currentValue,
            isCompleted
          }
        });
      }
    } catch (error) {
      console.error('Error updating goals progress:', error);
    }
  }
  ```

  Replacement content:
  ```typescript
  async function updateGoalsProgress(): Promise<void> {
    try {
      const activeGoals = await prisma.goal.findMany({
        where: {
          isCompleted: false,
          metricType: { not: 'CUSTOM' }
        }
      });

      if (activeGoals.length === 0) {
        return;
      }

      // Include equipment to identify CARDIO vs STRENGTH logs
      const logs = await prisma.workoutLog.findMany({
        include: {
          sets: true,
          equipment: true
        }
      });

      // Single pass to aggregate values
      let totalVolume = 0;
      let totalDistance = 0;
      let totalDuration = 0;
      let maxWeight = 0;

      for (const log of logs) {
        const isCardio = log.equipment?.muscleGroup === 'CARDIO';
        if (log.sets) {
          for (const set of log.sets) {
            if (isCardio) {
              totalDistance += set.weight || 0;
              totalDuration += set.reps || 0;
            } else {
              totalVolume += (set.weight || 0) * (set.reps || 0);
              if (set.weight && set.weight > maxWeight) {
                maxWeight = set.weight;
              }
            }
          }
        }
      }

      // Batch parallel database updates using Promise.all
      const updatePromises = activeGoals.map((goal) => {
        let currentValue = 0;
        if (goal.metricType === 'VOLUME') {
          currentValue = totalVolume;
        } else if (goal.metricType === 'DISTANCE') {
          currentValue = totalDistance;
        } else if (goal.metricType === 'DURATION') {
          currentValue = totalDuration;
        } else if (goal.metricType === 'WEIGHT_MAX') {
          currentValue = maxWeight;
        }

        const isCompleted = currentValue >= goal.targetValue;

        // Skip DB write if values have not changed (minor optimization)
        return prisma.goal.update({
          where: { id: goal.id },
          data: {
            currentValue,
            isCompleted
          }
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating goals progress:', error);
    }
  }
  ```

---

### Task 3: Implement Singleton pattern for GoogleGenerativeAI

**Files:**
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: Add getAIClient singleton helper at module level**
  Add a global client reference and helper function around line 38 of `server.ts` (after rate limiter definitions).
  ```typescript
  // Singleton AI Client
  let aiClientInstance: GoogleGenerativeAI | null = null;
  function getAIClient(): GoogleGenerativeAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!aiClientInstance) {
      aiClientInstance = new GoogleGenerativeAI(apiKey);
    }
    return aiClientInstance;
  }
  ```

- [ ] **Step 2: Replace AI client initializations in route handlers**
  Replace `new GoogleGenerativeAI(...)` instances in the 4 route handlers with `getAIClient()`.

  **Target 1 (GET /api/goals/recommend):**
  ```typescript
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  ```
  Replacement:
  ```typescript
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
  ```

  **Target 2 (POST /api/goals/:id/evaluate):**
  ```typescript
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  ```
  Replacement:
  ```typescript
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
  ```

  **Target 3 (POST /api/logs/monthly-analysis):**
  ```typescript
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  ```
  Replacement:
  ```typescript
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
  ```

  **Target 4 (POST /api/logs/monthly-analysis/chat):**
  ```typescript
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  ```
  Replacement:
  ```typescript
      const ai = getAIClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
      }
  ```

---

### Task 4: Re-build and Redeploy

**Files:**
- None (deployment commands)

- [ ] **Step 1: Verify backend build success**
  Run: `npm run build` inside `/opt/gym-tracker/backend`
  Expected: Successful TypeScript compilation.

- [ ] **Step 2: Restart docker-compose containers**
  Run: `docker compose down && docker compose up -d --build` inside `/opt/gym-tracker`
  Expected: Containers successfully rebuild and sync schema on startup.

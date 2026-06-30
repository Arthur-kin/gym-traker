# 目標設定與挑戰系統實作計畫 (Goals & Challenges System)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 Gymformer 新增「目標與挑戰系統」，支持進度自動更新與 Gemini AI Advisor 的可行性評估回饋。

**Architecture:**
1. 在 Prisma Schema 中新增 `Goal` 表，並將資料庫同步。
2. 於 Express 後端實作目標的 CRUD 接口以及 POST `/api/goals/:id/evaluate` 調用 Gemini 評估。
3. 實作訓練紀錄儲存時的 `updateGoalsProgress` 動態進度更新器。
4. 前端新增 `GoalsDashboard` 獨立 Tab 及 UI 組件，整合進度條、AI 評估展開區塊與 Modal 表單。

**Tech Stack:** React, TypeScript, Express, Prisma, Google Generative AI (Gemini)

---

### Task 1: 資料庫遷移與 Prisma Client 產生

**Files:**
- Modify: `/opt/gym-tracker/backend/prisma/schema.prisma`

- [ ] **Step 1: 新增 Goal 模型**
  在 `schema.prisma` 的最下方新增以下 Model：
  ```prisma
  // 訓練目標與挑戰
  model Goal {
    id           String   @id @default(uuid())
    title        String   // 目標/挑戰名稱
    type         String   // "GOAL" (長期目標) 或 "CHALLENGE" (短期挑戰)
    metricType   String   // "VOLUME", "DISTANCE", "DURATION", "WEIGHT_MAX", "CUSTOM"
    targetValue  Float    // 目標值
    currentValue Float    @default(0) // 目前累計進度
    unit         String   // 單位，例如: "kg", "km", "minutes", "times"
    deadline     String?  // 截止日期 (YYYY-MM-DD)
    isCompleted  Boolean  @default(false)
    aiFeedback   String?  // AI Coach 評估文字
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }
  ```

- [ ] **Step 2: 執行資料庫同步與 Prisma 客戶端產生**
  在 `/opt/gym-tracker/backend` 目錄下執行：
  ```bash
  npm run prisma:generate && npm run prisma:migrate
  ```
  *預期*：成功同步至 PostgreSQL 資料庫，無報錯。

- [ ] **Step 3: 提交變更到 Git**
  ```bash
  git add backend/prisma/schema.prisma
  git commit -m "feat(backend): add Goal model and generate Prisma client"
  ```

---

### Task 2: 後端 API 端點實作 (CRUD + AI 評估)

**Files:**
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: 實作目標 CRUD 路由**
  在 `server.ts` 裡面（在 layout 路由上方）新增 CRUD 端點：
  ```typescript
  // 取得所有目標
  app.get('/api/goals', async (req, res) => {
    try {
      const goals = await prisma.goal.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json(goals);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      return res.status(500).json({ error: 'Failed to fetch goals.' });
    }
  });

  // 建立新目標
  app.post('/api/goals', async (req, res) => {
    try {
      const { title, type, metricType, targetValue, unit, deadline } = req.body;
      if (!title || !type || !metricType || targetValue === undefined) {
        return res.status(400).json({ error: 'Missing required goal fields.' });
      }
      const goal = await prisma.goal.create({
        data: {
          title,
          type,
          metricType,
          targetValue: parseFloat(targetValue),
          unit: unit || '',
          deadline: deadline || null
        }
      });
      return res.json(goal);
    } catch (err) {
      console.error('Failed to create goal:', err);
      return res.status(500).json({ error: 'Failed to create goal.' });
    }
  });

  // 編輯與完成目標
  app.put('/api/goals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, currentValue, isCompleted, targetValue, deadline } = req.body;
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (currentValue !== undefined) data.currentValue = parseFloat(currentValue);
      if (isCompleted !== undefined) data.isCompleted = !!isCompleted;
      if (targetValue !== undefined) data.targetValue = parseFloat(targetValue);
      if (deadline !== undefined) data.deadline = deadline;

      const updated = await prisma.goal.update({
        where: { id },
        data
      });
      return res.json(updated);
    } catch (err) {
      console.error('Failed to update goal:', err);
      return res.status(500).json({ error: 'Failed to update goal.' });
    }
  });

  // 刪除目標
  app.delete('/api/goals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.goal.delete({ where: { id } });
      return res.json({ success: true });
    } catch (err) {
      console.error('Failed to delete goal:', err);
      return res.status(500).json({ error: 'Failed to delete goal.' });
    }
  });
  ```

- [ ] **Step 2: 實作 AI 評估端點**
  在 `server.ts` 中新增 `POST /api/goals/:id/evaluate` 接口，整合 Gemini 進行可行性評估：
  ```typescript
  app.post('/api/goals/:id/evaluate', async (req, res) => {
    try {
      const { id } = req.params;
      const goal = await prisma.goal.findUnique({ where: { id } });
      if (!goal) return res.status(404).json({ error: 'Goal not found.' });

      const profile = await prisma.userProfile.findUnique({
        where: { id: PROFILE_ID }
      });
      const ageStr = calculateAge(profile?.birthdate);

      const profileContext = profile 
        ? `生理特徵背景資訊：
- 身高：${profile.height ? `${profile.height} cm` : '未提供'}
- 體重：${profile.weight ? `${profile.weight} kg` : '未提供'}
- 年齡：${ageStr}
- 健身經驗階段：${profile.experience || '未提供'}
- 當前健身目標：${profile.fitnessGoal || '未提供'}`
        : '未設定生理背景。';

      const prompt = `你是一位專業的 AI 健身教練。請根據以下使用者的生理特徵與他所設定的訓練目標進行「可行性評估」：
      
[使用者背景資訊]
${profileContext}

[設定的目標]
- 名稱：${goal.title}
- 目標值：${goal.targetValue} ${goal.unit}
- 類型：${goal.type === 'GOAL' ? '長期目標' : '短期挑戰'}
- 指標類型：${goal.metricType}
- 截止日期：${goal.deadline || '未設定'}

請在 150 字以內，給出一個客觀、科學的評估建議：
1. 評估這個目標是否安全合理（若過於激進，請提出警告）。
2. 提供 1-2 點具體的訓練或執行建議。
3. 語氣保持專業、積極鼓勵但安全第一。`;

      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();

      const updated = await prisma.goal.update({
        where: { id },
        data: { aiFeedback: text }
      });
      return res.json(updated);
    } catch (err) {
      console.error('AI evaluation failed:', err);
      return res.status(500).json({ error: 'AI evaluation failed.' });
    }
  });
  ```

- [ ] **Step 3: 驗證後端編譯並 Commit**
  在 `/opt/gym-tracker/backend` 下執行 `npm run build` 成功。
  ```bash
  git add backend/src/server.ts
  git commit -m "feat(backend): implement goal CRUD and AI evaluation endpoints"
  ```

---

### Task 3: 訓練紀錄存檔時自動更新進度邏輯

**Files:**
- Modify: `/opt/gym-tracker/backend/src/server.ts`

- [ ] **Step 1: 實作進度累加器函式**
  在 `server.ts` 底部實作 `updateGoalsProgress`：
  ```typescript
  async function updateGoalsProgress() {
    try {
      const goals = await prisma.goal.findMany({
        where: { isCompleted: false, metricType: { not: 'CUSTOM' } }
      });
      if (goals.length === 0) return;

      const logs = await prisma.workoutLog.findMany({
        include: { sets: true }
      });

      for (const goal of goals) {
        let current = 0;
        
        if (goal.metricType === 'VOLUME') {
          // 累加所有歷史 logs 的 weight * reps
          for (const log of logs) {
            for (const set of log.sets) {
              current += (set.weight || 0) * (set.reps || 0);
            }
          }
        } else if (goal.metricType === 'DISTANCE') {
          // 累加所有 Cardio 運動的 distance (跑步機的 distance 保存在 sets 或 logs 中)
          // 註: distance 在 workouts 裡面通常為單組 distance
          for (const log of logs) {
            for (const set of log.sets) {
              // 在 schema 中，cardio 欄位通常存在於 log 中或是單組的 reps 代表距離/時間？
              // 依據 earlier specs, reps 在 cardio 代表 distance (km) 或時間
              // 這裡我們檢查 log 中 sets 的 reps (有氧時 reps 代表公里數或時間)
              // 根據有氧設計：reps 填寫距離(公里)，或 reps 作為次數，weight 則是阻力/坡度。
              // 這裡統一使用 reps 代表 distance
              current += set.reps || 0;
            }
          }
        } else if (goal.metricType === 'WEIGHT_MAX') {
          // 尋找最大重量
          for (const log of logs) {
            for (const set of log.sets) {
              if ((set.weight || 0) > current) {
                current = set.weight || 0;
              }
            }
          }
        }

        const isCompleted = current >= goal.targetValue;
        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            currentValue: current,
            isCompleted
          }
        });
      }
    } catch (err) {
      console.error('Failed to update goals progress:', err);
    }
  }
  ```

- [ ] **Step 2: 於 Log 保存端點串接更新器**
  在 `POST /api/logs` 與 `PUT /api/logs/:id` 的成功回覆前，加上 `updateGoalsProgress();` 觸發。

- [ ] **Step 3: 驗證後端編譯並 Commit**
  ```bash
  npm run build
  git commit -am "feat(backend): integrate dynamic goals progress auto-updater"
  ```

---

### Task 4: 前端 App.tsx 導覽列與狀態切換

**Files:**
- Modify: `/opt/gym-tracker/frontend/src/App.tsx`

- [ ] **Step 1: 新增 goals Tab 狀態**
  在 `App.tsx` 將 `activeTab` 的型別更新並渲染按鈕：
  ```tsx
  // 於 navbar header 中 header-actions 左側渲染按鈕
  <button
    className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
    onClick={() => setActiveTab('goals')}
  >
    <Award size={18} />
    目標與挑戰
  </button>
  ```
  *(注：需要從 'lucide-react' 引入 `Award` 圖標)*

- [ ] **Step 2: 驗證編譯並 Commit**
  在 `frontend` 執行 `npm run build`。
  ```bash
  git commit -am "feat(frontend): integrate Goals tab into navigation panel"
  ```

---

### Task 5: 實作 GoalsDashboard.tsx 元件

**Files:**
- Create: `/opt/gym-tracker/frontend/src/components/GoalsDashboard.tsx`
- Modify: `/opt/gym-tracker/frontend/src/App.tsx`

- [ ] **Step 1: 建立 GoalsDashboard.tsx 檔案**
  實作完整包含長期目標與短期挑戰展示、進度條、AI 評估渲染、手動更新以及「新增目標 Modal」的 React 元件。
  程式碼中需對應 API 的 `GET /api/goals`, `POST /api/goals`, `DELETE /api/goals/:id`, `POST /api/goals/:id/evaluate`。

- [ ] **Step 2: 在 App.tsx 中渲染 GoalsDashboard**
  當 `activeTab === 'goals'` 時，渲染 `<GoalsDashboard />`。

- [ ] **Step 3: 進行前端 Build 驗證並 Commit**
  ```bash
  npm run build
  git add frontend/src/components/GoalsDashboard.tsx frontend/src/App.tsx
  git commit -m "feat(frontend): create GoalsDashboard component and integrate page rendering"
  ```

---

### Task 6: 容器部署與端到端驗證

**Files:**
- None

- [ ] **Step 1: 重啟與編譯 Docker 容器**
  ```bash
  docker compose up -d --build
  ```

- [ ] **Step 2: 端到端功能手動驗證**
  1. 進入網頁點擊「目標與挑戰」頁籤。
  2. 新增一個 `VOLUME` 類型的目標，例如深蹲 5000 kg。
  3. 點擊「AI 評估」按鈕，確認 Gemini 可行性回饋順利顯示於卡片內。
  4. 新增一筆訓練日誌，確認目標的 `currentValue` 進度條自動累加更新。

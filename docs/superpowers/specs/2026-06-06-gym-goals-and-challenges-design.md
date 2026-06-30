# 目標設定與挑戰系統設計規格書 (Goals & Challenges System)

本設計規格書旨在為 Gymformer 系統新增「目標設定與挑戰系統」，整合 AI 輔助教練的可行性評估，並支持從訓練日誌中自動追蹤累計進度。

---

## 1. 系統架構與資料庫設計 (Prisma Model)

我們將在 `/opt/gym-tracker/backend/prisma/schema.prisma` 中新增 `Goal` 模型：

```prisma
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

---

## 2. API 端點設計 (Backend API)

在 `/opt/gym-tracker/backend/src/server.ts` 中新增以下路由：

### 2.1 基礎 CRUD API
* **GET `/api/goals`**：取得所有進行中與已完成的目標。
* **POST `/api/goals`**：建立新的目標/挑戰。
  * 驗證：`title` 必須為非空字串，`targetValue` 必須為正數，`type` 與 `metricType` 必須為合法字串列舉。
* **PUT `/api/goals/:id`**：編輯目標內容或手動勾選完成。
* **DELETE `/api/goals/:id`**：刪除特定目標。

### 2.2 AI 評估 API
* **POST `/api/goals/:id/evaluate`**：
  * **邏輯**：
    1. 撈取該 `id` 對應的 `Goal` 紀錄。
    2. 撈取使用者的 `UserProfile` 生理背景資訊。
    3. 組裝 Prompt，呼叫 Google Generative AI。
    4. 將 AI 的可行性評估寫入 `aiFeedback` 欄位並保存。
    5. 回傳最新的 `Goal` 物件（包含 `aiFeedback`）。

---

## 3. 進度自動累加邏輯 (Progress Auto-Updater)

在 `/opt/gym-tracker/backend/src/server.ts` 中，每當使用者寫入訓練紀錄時（在 `POST /api/logs` 與 `PUT /api/logs/:id` 的成功保存區塊中），後端會觸發一個更新函式 `updateGoalsProgress()`：

### 累加運算邏輯：
1. 撈取所有 `isCompleted` 為 `false` 且 `metricType` 不等於 `"CUSTOM"` 的目標/挑戰。
2. 對於每一個進行中的目標，查詢相關的訓練紀錄：
   * **`VOLUME`**：計算所有訓練日誌（WorkoutLog）中對應的總訓練音量（所有 sets 的 `weight * reps` 總和）。
   * **`DISTANCE`**：計算所有有氧紀錄中 `distance` 欄位的總和。
   * **`DURATION`**：計算所有有氧紀錄中 `time` (時間) 欄位的總和。
   * **`WEIGHT_MAX`**：找出歷史紀錄中最大的單組 `weight` 數值。
3. 更新該 `Goal` 的 `currentValue`。若 `currentValue >= targetValue`，則將 `isCompleted` 標記為 `true`。

---

## 4. 前端 UI 設計 (🏆 獨立目標頁籤)

### 4.1 頂部導覽列與狀態切換
* 在 [App.tsx](file:///opt/gym-tracker/frontend/src/App.tsx) 中新增 Tab 狀態 `'goals'`。
* 在 Navbar 的 header 中新增與 layout、analytics 並列的按鈕：
  ```tsx
  <button className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
    <Award size={18} />
    🏆 Goals & Challenges
  </button>
  ```

### 4.2 目標主面板 (GoalsDashboard)
建立新組件 `GoalsDashboard.tsx`：
* **分區展示**：上方展示長期目標（GOAL），下方展示短期挑戰（CHALLENGE），並區分「進行中」與「已完成」。
* **進度條與視覺**：
  * 使用金色漸層（或黑紫漸層）渲染進度條（`currentValue / targetValue`）。
  * 若目標已完成（`isCompleted == true`），顯示金色的獎盃圖標與綠色打勾標示。
* **AI Coach 評估面版**：
  * 每張卡片下方有「🤖 AI 教練可行性評估」按鈕。
  * 點擊後，觸發 API 發送請求。取得評估後，在卡片內以毛玻璃面板展開顯示評估文字。
* **新增表單 Modal**：
  * 輸入名稱、選擇類型（長期/短期）、選擇追蹤方式（自動量化累加或純手動勾選）、輸入目標值與截止日期。

---

## 5. 驗證條件
1. **Prisma 遷移**：執行 `npx prisma db push` 成功更新資料庫。
2. **API 測試**：
   * POST 建立目標成功，並能透過 GET 獲取。
   * 寫入一筆新的訓練紀錄後，`currentValue` 能夠自動累加。
   * 點擊 AI 評估後，能順利取得並儲存 Gemini 的評估文字。
3. **前端渲染**：
   * 各種進度條、完成百分比顯示正常。
   * AI 評估的折疊面板動態效果平滑無溢出。

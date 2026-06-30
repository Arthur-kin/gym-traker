# Gymformer 訓練歷史日誌總表與修改紀錄設計規格書

本文件定義了 Gymformer 訓練紀錄系統的「綜合訓練歷史日誌總表」與「修改紀錄（編輯）」功能的設計與實作。

## 1. 設計定位與使用者體驗

- **日誌總表**：在數據分析（Workout Analytics）分頁底部新增一個全局訓練紀錄表格，包含：日期、器材名稱、訓練部位、詳細組數（支援有氧/重訓格式）、訓練備忘，以及動作列（編輯與刪除）。
- **修改紀錄**：點擊編輯按鈕後，重新開啟 `WorkoutLogger` 彈出視窗並切換為「編輯模式」，帶入該筆紀錄的舊數值。儲存後發送更新 API，圖表與表格數據同步更新。

---

## 2. 後端 API 規格 (`server.ts`)

新增 `PUT /api/logs/:id` 路由：
- **路徑**：`/api/logs/:id`
- **方法**：`PUT`
- **請求體**：`{ sets: Array<{ setNumber: number, weight: number, reps: number, rpe?: number|null }>, notes?: string }`
- **邏輯**：使用 Prisma Transaction 先清除該 `logId` 的舊 `WorkoutSet`，再重新建立新組數，並更新 `WorkoutLog` 的 `notes`。

---

## 3. 前端架構與屬性變更

### A. `App.tsx` 狀態與處理函式
1. **新增狀態**：`const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);`
2. **新增 API 呼叫**：`handleUpdateLog(logId, logData)` 發送 `PUT /api/logs/:id` 請求，更新成功後重新獲取日誌並關閉編輯視窗。
3. **Modal 開啟條件**：
   如果 `editingLog` 有值，同樣彈出 `WorkoutLogger` 元件，並傳入：
   - `equipment={editingLog.equipment}`
   - `editLog={editingLog}`
   - `onUpdateLog={handleUpdateLog}`

### B. `WorkoutLogger.tsx` 編輯模式支援
1. **新增 Props**：
   - `editLog?: WorkoutLog;`
   - `onUpdateLog?: (logId: string, logData: { sets: ...; notes?: string }) => Promise<boolean>;`
2. **編輯模式渲染**：
   - 如果 `editLog` 存在，視窗標題變更為 `修改訓練紀錄 - {equipment.customName}`。
   - 儲存按鈕文字變更為 `儲存修改 (Update Log)`。
   - 表單送出時，呼叫 `onUpdateLog` 而非 `onAddLog`。

### C. `AnalyticsCharts.tsx` 歷史日誌總表
在左側分析面板底部渲染一個表格卡片：
1. **篩選器**：
   - 搜尋框：依器材名稱過濾。
   - 下拉選單：依訓練部位（肌群）過濾。
2. **日誌列表 (Table/List)**：
   - 表格設有固定高度（如 `350px`）與獨立縱向滾動，防頁面過長。
   - 詳細組數欄位依運動種類自動顯示 `{weight} kg x {reps} reps` 或 `{distance} km x {time} mins`。
   - 右側動作列包含「編輯」與「刪除」按鈕。

---

## 4. 驗證條件 (Verification Criteria)

1. **功能驗證**：
   - 在歷史日誌總表中輸入關鍵字，表格能即時過濾器材。
   - 點擊垃圾桶能刪除紀錄，圖表與歷史表格隨即同步更新。
   - 點擊鉛筆編輯按鈕，彈出視窗能帶入該筆紀錄的所有組數，修改後儲存，數據庫與畫面即時成功更新。
2. **編譯驗證**：前端與後端皆能通過靜態編譯無報錯。

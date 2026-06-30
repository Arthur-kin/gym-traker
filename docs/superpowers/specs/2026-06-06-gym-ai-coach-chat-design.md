# Gymformer AI 智慧教練對話與長線分析設計規格書

本文件定義了 Gymformer 系統中「全部歷史分析」與「AI 教練即時對話」功能的設計與實作。對話紀錄將透過 LocalStorage 在本地端進行儲存與管理，不更動資料庫 Schema。

---

## 1. 功能需求與使用者故事

1. **選項 A：全部歷史訓練報告 (All-Time Analysis)**
   * 使用者在月份選單中選擇「全部歷史紀錄 (All-Time)」並點選「產生報告」時，後端會撈取所有歷史訓練紀錄，彙整總天數、總組數與主要部位比例。
   * AI 教練將針對長期的訓練表現，給予長線的體態發展分析與宏觀訓練指南。
2. **選項 B：AI 教練對話 (AI Coach Chat)**
   * 在產出的報告下方，新增一個互動聊天視窗。
   * 使用者可以詢問關於該報告數據的後續問題，例如「如何調整我的訓練表」、「某個部位可以做哪些動作」等。
   * 聊天內容會與當前選定的報告（例如特定月份或全部歷史）綁定，透過 LocalStorage 儲存在使用者本地端，重新整理網頁時對話不會消失，並提供「清除對話」的選項。

---

## 2. API 介面規格

### A. 修改原有報告 API `POST /api/logs/monthly-analysis`
* **請求格式**：
  * `{ yearMonth: "all-time" | "YYYY-MM", model?: string }`
* **後端邏輯**：
  * 如果 `yearMonth === "all-time"`：
    * 查詢所有 `WorkoutLog` 與 `WorkoutSet`。
    * Prompt 調整為針對長線數據的趨勢分析。
  * 如果 `yearMonth === "YYYY-MM"`：
    * 維持原有的單月過濾邏輯。

### B. 新增無狀態對話 API `POST /api/logs/monthly-analysis/chat`
* **請求方式**：`POST`
* **請求體 (JSON)**：
  ```json
  {
    "stats": {
      "totalDays": 12,
      "totalSets": 120,
      "muscleDistribution": { "BACK_LAT": 40, "CHEST_UPPER": 30 }
    },
    "coachFeedback": "先前生成的教練建議...",
    "history": [
      { "role": "user", "content": "我的背部比例很高，這樣好嗎？" },
      { "role": "model", "content": "背部訓練充足能建立好體態..." }
    ],
    "message": "那我下個月胸肌想加強，要怎麼調整？",
    "model": "gemini-flash-latest"
  }
  ```
* **回應體 (JSON)**：
  ```json
  {
    "response": "如果您想加強胸肌，我建議可以將上胸組數提升 10%..."
  }
  ```
* **後端 Prompt 模板**：
  * 系統提示：
    ```
    You are a professional fitness personal trainer. You are chatting with a client who has just read their monthly training report (or all-time training report).
    
    Here is their training stats:
    - Days trained: {totalDays}
    - Total sets: {totalSets}
    - Muscle distribution: {muscleDistribution}
    
    Here is the initial coach report that was generated for them:
    {coachFeedback}
    
    Please answer the client's next question in Traditional Chinese (繁體中文). Keep your tone encouraging, professional, and practical. Keep the response concise (within 150-250 words).
    ```

---

## 3. 前端 UI 設計 (`AnalyticsCharts.tsx`)

### A. 選擇器整合
* 月份選單最上方加入：`<option value="all-time">全部歷史紀錄</option>`。

### B. 本地端儲存對話設計 (LocalStorage)
* 對話記錄以報告的 `yearMonth` 作為 Key 進行存檔，例如 `gym_chat_all-time` 或 `gym_chat_2026-06`。
* 狀態變數：`chatHistory` (格式：`Array<{ role: 'user' | 'model', content: string }>`)。
* 切換報告時，自動載入對應 Key 的歷史對話。

### C. 聊天視窗介面 (Chatbox UI)
* 卡片內部排列在 Coach Report 下方，設計樣式符合深紫黑與金黃主題：
  * **訊息清單**：支援垂直捲動。
  * **泡泡氣泡**：
    * 使用者（`user`）：靠右，背景 `var(--gold-primary)`，字體黑色，圓角為 `12px 12px 2px 12px`。
    * 教練（`model`）：靠左，背景 `rgba(255,255,255,0.05)`，邊框為金黃，字體白色，圓角為 `12px 12px 12px 2px`。
  * **輸入框與按鈕**：
    * 文字輸入框、傳送按鈕。
    * 當 `isWaitingForChat` 為 `true` 時，輸入框 disabled，並呈現 `教練正在思考中...` 狀態動畫。
    * 「清除對話」按鈕：清除當前報告的 LocalStorage 對話暫存，重設 `chatHistory` 為空。

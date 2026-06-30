# Gymformer 個人檔案系統設計規格書

本文件定義了 Gymformer 系統中「個人檔案設定（身高、體重、生日、經驗、目標）」功能與後端 API、資料庫結構，以及 AI 智慧教練的對接設計。

---

## 1. 資料庫 Schema 變更

在 [schema.prisma](file:///opt/gym-tracker/backend/prisma/schema.prisma) 中新增一個 `UserProfile` 模型，保存單一使用者的身體數據指標：

```prisma
model UserProfile {
  id          String   @id @default(uuid())
  height      Float?   // 身高 (cm)
  weight      Float?   // 體重 (kg)
  birthdate   String?  // 生日 (格式: YYYY-MM-DD)
  experience  String?  // 經驗: BEGINNER, INTERMEDIATE, ADVANCED
  fitnessGoal String?  // 目標: LOSE_FAT, BUILD_MUSCLE, MAINTENANCE
  updatedAt   DateTime @updatedAt
}
```

---

## 2. 後端 API 規格變更

在 [server.ts](file:///opt/gym-tracker/backend/src/server.ts) 中新增以下個人檔案管理介面：

### A. `GET /api/profile`
* **功能**：獲取目前唯一一筆個人檔案資料。
* **邏輯**：
  1. 查詢資料庫 `UserProfile`。
  2. 若無紀錄，則自動建立一筆空資料 `UserProfile.create({ data: {} })` 並回傳，確保介面運作正常且主體唯一。
  3. 回傳 HTTP 200 及該 profile 物件。

### B. `PUT /api/profile`
* **功能**：更新個人設定。
* **請求 Payload**：
  ```json
  {
    "height": 175.5,
    "weight": 72.0,
    "birthdate": "1998-05-15",
    "experience": "INTERMEDIATE",
    "fitnessGoal": "BUILD_MUSCLE"
  }
  ```
* **資料驗證**：
  - 身高 (`height`) 與體重 (`weight`) 若有填寫，必須是大於零的正數。
  - 經驗值 (`experience`) 限制在 `["BEGINNER", "INTERMEDIATE", "ADVANCED", null, ""]` 之內。
  - 目標 (`fitnessGoal`) 限制在 `["LOSE_FAT", "BUILD_MUSCLE", "MAINTENANCE", null, ""]` 之內。
* **邏輯**：
  - 更新資料庫中的該筆 `UserProfile`，並回傳更新後的 profile 物件。

---

## 3. 前端 UI 規格變更 (`App.tsx` 與新組件)

### A. 導覽列入口
* 在 `App.tsx` 右上角（與「畫布/數據分析」標籤、主題切換圖示同一排）新增一個 `👤 個人資料` 按鈕。
* 按鈕樣式使用 Gold-Gray 主題色調的邊框與金色懸停效果，與整體排版保持和諧。

### B. 新增個人檔案彈出視窗 (`ProfileModal.tsx`)
* 點選按鈕後打開對話框，表單中包含以下欄位：
  - **身高 (cm)**：數字輸入框，`min="1"`。
  - **體重 (kg)**：數字輸入框，`min="1"`。
  - **生日**：日期選擇框 `<input type="date">`。
  - **運動經驗**：下拉選單（包含：未設定、新手、中階、進階）。
  - **健身目標**：下拉選單（包含：未設定、減脂、增肌、維持體態）。
* **BMI 即時試算**：
  - 當身高與體重皆有填寫時，視窗底部會動態算出 BMI。
  - 公式：$BMI = \text{體重 (kg)} / (\text{身高 (m)})^2$
  - 提供動態健康狀態分級（如：BMI < 18.5 為「體重過輕」，18.5 ~ 24 為「正常範圍」，24 ~ 27 為「過重」，>= 27 為「肥胖」）。

---

## 4. AI 智慧教練整合規格

在 `server.ts` 中，對 AI 智慧分析報告及 AI 對話教練的 Prompt 注入個人身體特徵。

### A. 生成月報 / 全期報告 (`POST /api/logs/monthly-analysis`)
1. 查詢資料庫中的唯一一筆 `UserProfile`。
2. 計算年齡（依據生日與當前日期）。
3. 將個人化身體指標合併至 Gemini Prompt：
   ```typescript
   const profile = await prisma.userProfile.findFirst();
   // 組合身體特徵字串：身高、體重、年齡、健身經驗、目標
   ```
4. 調整 AI System Prompt，要求教練根據使用者的身體情況（例如 BMI、目標是增肌或減脂）來提供精準的訓練與飲食搭配建議。

### B. 教練聊天 API (`POST /api/logs/monthly-analysis/chat`)
1. 查詢 `UserProfile` 資料。
2. 同步注入該身體特徵字串至 Gemini `systemInstruction` 系統提示字元中，確保對話中教練理解對方的生理現況。

# Gymformer 有氧運動數據強化設計規格書

本文件定義了 Gymformer 系統中「有氧運動細部指標紀錄（坡度、阻力、心率）」功能與動態欄位輸入框的設計與實作。

---

## 1. 資料庫 Schema 變估

在 [schema.prisma](file:///opt/gym-tracker/backend/prisma/schema.prisma) 的 `WorkoutSet` 模型中新增三個選填欄位：

```prisma
model WorkoutSet {
  id           String     @id @default(uuid())
  logId        String
  log          WorkoutLog @relation(fields: [logId], references: [id], onDelete: Cascade)
  setNumber    Int        // 第幾組 (1, 2, 3...)
  weight       Float      // 重量 (kg/lbs) 或有氧距離 (km)
  reps         Int        // 次數 (Reps) 或有氧時間 (分鐘)
  rpe          Int?       // 重訓的自覺強度 (1-10)
  incline      Float?     // 有氧坡度 (%) ── [新增]
  resistance   Int?       // 有氧阻力段數 (Level) ── [新增]
  heartRate    Int?       // 有氧平均心率 (BPM) ── [新增]
}
```

---

## 2. 後端 API 規格變更

### A. 修改 `POST /api/logs` 與 `PUT /api/logs/:id`
* **請求資料結構 (WorkoutSet 部分)**：
  除了現有的 `setNumber`, `weight`, `reps`, `rpe`，後端也應接收並解析 `incline`, `resistance`, `heartRate`。
* **欄位解析邏輯**：
  在 [server.ts](file:///opt/gym-tracker/backend/src/server.ts) 中寫入或修改資料時：
  * `incline`: `s.incline ? parseFloat(s.incline) : null`
  * `resistance`: `s.resistance ? parseInt(s.resistance) : null`
  * `heartRate`: `s.heartRate ? parseInt(s.heartRate) : null`

---

## 3. 前端 UI 規格變更 (`WorkoutLogger.tsx`)

### A. 資料欄位型別擴充
將 `SetInput` 介面擴充為：
```typescript
interface SetInput {
  weight: string;
  reps: string;
  rpe: string;
  incline: string;     // 新增
  resistance: string;  // 新增
  heartRate: string;   // 新增
}
```

### B. 器材型態識別邏輯
* `const isCardio = equipment.muscleGroup === 'CARDIO';`
* `const isTreadmill = isCardio && equipment.type.startsWith('T');`
* `const isResistanceCardio = isCardio && (equipment.type.startsWith('C') || equipment.type.startsWith('S') || equipment.type.startsWith('E'));`

### C. 彈性輸入欄位版面 (Grid Layout)
網格欄位名稱與輸入框寬度會動態調整：
1. **重訓模式 (isCardio = false)**：
   * 網格欄位：`組數 (40px) | 重量 (1fr) | 次數 (1fr) | RPE (60px) | 動作 (40px)`
   * `weight` 佔位符為 `"kg/lbs"`，`reps` 佔位符為 `"reps"`，`rpe` 佔位符為 `"1-10"`。
2. **跑步機模式 (isTreadmill = true)**：
   * 網格欄位：`組數 (40px) | 距離 (1fr) | 時間 (1fr) | 心率 (80px) | 坡度 (80px) | 動作 (40px)`
   * `weight` 佔位符為 `"km"`，`reps` 佔位符為 `"mins"`，`heartRate` 佔位符為 `"BPM"`，`incline` 佔位符為 `"%"`。
3. **阻力有氧模式 (isResistanceCardio = true)**：
   * 網格欄位：`組數 (40px) | 距離 (1fr) | 時間 (1fr) | 心率 (80px) | 阻力 (80px) | 動作 (40px)`
   * `weight` 佔位符為 `"km"`，`reps` 佔位符為 `"mins"`，`heartRate` 佔位符為 `"BPM"`，`resistance` 佔位符為 `"Lvl"`。

### D. 歷史紀錄呈現邏輯
在 `WorkoutLogger.tsx` 底部 History 清單中，對有氧運動組數的渲染做邏輯判斷：
* 如果 `isCardio` 為真：
  * 主要資訊顯示：`{s.weight} km × {s.reps} mins`
  * 附加指標區：
    * 若有心率且有坡度 (跑步機)：`(心率: {s.heartRate} BPM, 坡度: {s.incline}%)`
    * 若有心率且有阻力 (飛輪等)：`(心率: {s.heartRate} BPM, 阻力: Lvl {s.resistance})`
    * 若僅有心率：`(心率: {s.heartRate} BPM)`

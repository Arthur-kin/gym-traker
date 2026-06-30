# 健身房細分肌群與純 kg 進階進度追蹤設計規格 (Detailed Muscle Group & Pure KG Progress Design Spec)

## 1. 目的與背景
使用者希望能夠：
1. **細分更詳細的肌群/部位**（如二頭、三頭、前臂、上胸、下胸、小腿等），並在點擊器材時能靈活選擇這些部位。
2. **使用解剖肌肉熱力圖**（正面與背面人體解剖圖）呈現最近的部位訓練熱度。
3. **長期進度追蹤以純 kg（重量）呈現**：
   - 移除複雜的 1RM 估算。
   - 改為展示「單次最高重量 (Max Weight in kg)」與「總載重量 (Total Load in kg)」。

## 2. 變更範圍與實作細節

### A. 全新定義的 18 個細分肌群 (18 Detailed Muscle Groups)
我們將在前端與資料庫中支援以下細分部位：
- **`ANY`**: 自由選擇 / 複合肌群 (預設於自由重量器材)
- **`CHEST_UPPER`**: 上胸肌 (Upper Chest)
- **`CHEST_LOWER`**: 中下胸肌 (Lower Chest)
- **`BACK_LAT`**: 背闊肌 (Lats)
- **`BACK_UPPER`**: 上背斜方群 (Upper Back/Traps)
- **`BACK_LOWER`**: 下背豎脊肌 (Lower Back)
- **`SHOULDERS_FRONT`**: 前三角肌 (Anterior Delt)
- **`SHOULDERS_LAT`**: 側三角肌 (Lateral Delt)
- **`SHOULDERS_REAR`**: 後三角肌 (Posterior Delt)
- **`ARMS_BICEPS`**: 肱二頭肌 (Biceps)
- **`ARMS_TRICEPS`**: 肱三頭肌 (Triceps)
- **`ARMS_FOREARM`**: 前臂與肱肌 (Forearms/Brachialis)
- **`LEGS_QUADS`**: 股四頭肌/大腿前側 (Quadriceps)
- **`LEGS_HAMSTRINGS`**: 大腿後側/膕繩肌 (Hamstrings)
- **`LEGS_GLUTES`**: 臀大肌 (Glutes)
- **`LEGS_CALVES`**: 小腿肌 (Calves)
- **`CORE_ABS`**: 腹直肌/上腹 (Abs)
- **`CORE_OBLIQUE`**: 側腹/外斜肌 (Obliques)
- **`CARDIO`**: 心肺有氧 (Cardio)

我們將在 [WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx) 中更新對應的中文下拉選單。

### B. 互動式肌肉熱力圖 (Anatomical Heatmap Component)
在 [AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx) 中：
- 實作一組精美的正面與背面人體解剖向量路徑 (Inline SVG)。
- 將熱力圖與最近 30 天的訓練數據進行綁定。
- 當使用者點選人體上的任意肌肉部位時，會自動載入該部位的歷史數據到旁邊的進化折線圖中。

### C. 純 kg 進化表現折線圖 (Pure KG Progression Chart)
在 [AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx) 中更新折線圖：
- 點選部位後，讀取所有歷史訓練紀錄。
- 計算每次訓練的：
  - **單次最高重量 (Max Weight in kg)**: `Math.max(...sets.map(s => s.weight))`
  - **單次總載重 (Total Load in kg)**: `sum(sets.map(s => s.weight * s.reps))`
- 圖表中繪製兩條曲線：
  - 黃金實線：Max Weight (kg)
  - 灰白虛線：Total Load (kg)

## 3. 測試與驗證計畫
1. **下拉選單驗證**：打開 Workout Logger 視窗，下拉選單是否包含上述所有 18 個細分部位且有清楚的中文翻譯。
2. **熱力圖渲染驗證**：進入 Analytics 頁面，確認正面與背面解剖圖已正確顯示，滑鼠移過去有提示，且點擊肌肉部位能正確載入並切換折線圖。
3. **進化曲線驗證**：確認折線圖縱軸單位為 kg，並且 Max Weight 與 Total Load 計算與歷史資料庫紀錄一致。

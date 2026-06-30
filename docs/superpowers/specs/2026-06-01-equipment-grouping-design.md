# 健身房器材分類與肌群自訂設計規格 (Gym Equipment Grouping & Custom Muscle Design Spec)

## 1. 目的與背景
使用者希望在 Gymformer 的器材庫中，能清楚區分「自由重量」與「固定器械」：
- **自由重量區**：可以自選鍛鍊部位/肌群，無固定限制。
- **固定器械區**：針對特定單一/雙功能部位進行鍛鍊。
- **有氧區**：心肺有氧訓練。

為了優化使用者體驗，我們將左側器材庫由扁平列表改為分區折疊列表（方案 B），並修復前端修改肌群時後端無法儲存的 Bug。

## 2. 變更範圍與實作細節

### A. 前端器材範本定義 (Frontend Equipment Templates)
在 [GymCanvas.tsx](file:///opt/gym-tracker/frontend/src/components/GymCanvas.tsx) 中更新 `EQUIPMENT_TEMPLATES`：
- 為每個 template 新增 `category` 屬性，包含以下三種類別：
  - `free_weight` (自由重量)：Power Rack, Bench Press, Dumbbells, Kettlebells
  - `machine` (固定插銷器械)：DF300, DF301, DF303, DF304, DF305, DF308, DS972, N915, N916, N917, N918, N957
  - `cardio` (有氧與其他)：T665 (Treadmill)
- 「自由重量」器材的 `muscleGroup` 預設值改為 `'ANY'`，使其在尚未自選肌群前，不顯示特定的肌肉小人。

### B. 左側選單 UI 調整 (Sidebar Grouped UI)
在 [GymCanvas.tsx](file:///opt/gym-tracker/frontend/src/components/GymCanvas.tsx) 的 Sidebar 渲染部分：
- 新增 `expandedCategories` 狀態 (State)，用來控制各個分類的展開與折疊：
  ```typescript
  const [expandedCategories, setExpandedCategories] = useState({
    free_weight: true,
    machine: true,
    cardio: true
  });
  ```
- 左側選單分為三個區塊，並加上黃金漸層的標題與折疊箭頭（`▲` / `▼`）。
- 搜尋欄位仍支援全域搜尋，但搜尋結果會依照分類區塊展示。

### C. 後端 Layout 更新邏輯修正 (Backend Bugfix)
在 [server.ts](file:///opt/gym-tracker/backend/src/server.ts) 的 `POST /api/layout` 路由中：
- 在更新已存在器材 (`tx.placedEquipment.update`) 時，將 `muscleGroup` 加入更新屬性中：
  ```diff
            const updated = await tx.placedEquipment.update({
              where: { id: eq.id },
              data: {
                customName: eq.customName,
  +             muscleGroup: eq.muscleGroup,
                gridX: eq.gridX,
                gridY: eq.gridY,
                rotation: eq.rotation,
              }
            });
  ```
- 如此一來，使用者在彈出式 Logger 中更新目標肌群時，變更便能成功儲存到 PostgreSQL 中。

## 3. 測試與驗證計畫
1. **介面驗證**：進入網頁，左側選單是否以「自由重量區」、「固定器械區」與「有氧區」分類，且標題可以點擊折疊/展開。
2. **肌群修改測試**：
   - 拖曳一個自由重量（如 Dumbbells）到畫布。
   - 雙擊打開訓練記錄視窗（Workout Logger）。
   - 修改其目標肌群為 `CHEST`。
   - 關閉視窗，重新整理網頁，確認該啞鈴的目標肌群仍為 `CHEST`，且後端資料庫已同步更新。

# Gymformer 手機版排版響應式優化設計規格書 (Mobile Responsiveness Design Spec)

本文件定義了 Gymformer 健身房管理與訓練紀錄系統在手機等行動裝置（窄螢幕）上的排版優化設計。

## 1. 設計原則與定位

為了提供最直覺的手機端操作體驗，本系統對桌機端與手機端進行功能分流：
- **桌機端 (Desktop - 螢幕寬度 > 768px)**: 保有完整 2D 健身房佈局繪製、器材拖擺、網格尺寸編輯與分析圖表。
- **手機端 (Mobile - 螢幕寬度 <= 768px)**: 轉為「隨身查閱與訓練記錄工具」。
  - 隱藏左側器材庫與網格配置工具。
  - 網格畫布改為**唯讀模式**（不能拖放，但可以**點擊已擺放器材來記錄訓練**）。
  - 數據分析圖表從「左右併排」改為「上下垂直堆疊」，提供自然捲動體驗。

---

## 2. 元件結構調整與 Class 標記

為了能在 CSS 中精確控制響應式行為，需對現有元件進行少量 HTML/JSX 標記調整：

### A. `App.tsx` 中的主容器
在 `.dashboard-main` 容器加上當前選取頁籤的 Class，便於在數據分析分頁套用捲動樣式：
```typescript
<main className={`dashboard-main tab-${activeTab}`}>
```

### B. `GymCanvas.tsx` 中的包裝元件
1. 為左側器材庫的最外層 Div 加上 `className="sidebar-left-wrapper"`：
   ```typescript
   <div className="sidebar-left-wrapper" style={{ position: 'relative', display: 'flex', ... }}>
   ```
2. 為左側側邊欄的收合按鈕 Div/Button 加上 `className="sidebar-toggle-btn"`：
   ```typescript
   <button className="sidebar-toggle-btn" ...>
   ```
3. 為畫布上方控制區（包含網格維度設定與 Zoom 拉桿）的右側 Div 加上 `className="canvas-header-controls"`：
   ```typescript
   <div className="canvas-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
   ```

---

## 3. 響應式 CSS 樣式定義 (`index.css`)

將在 `/opt/gym-tracker/frontend/src/index.css` 的尾部新增媒體查詢規則：

### A. 全局與導覽列限制 (`@media (max-width: 768px)`)
```css
@media (max-width: 768px) {
  /* 頂部導覽列優化 */
  .app-header {
    padding: 0 16px;
    height: 60px;
  }
  
  .brand-logo {
    width: 20px;
    height: 20px;
  }

  .brand-text {
    font-size: 16px;
  }

  /* 隱藏標題的副標 "/ Layout & Track" */
  .brand-text span {
    display: none;
  }

  .nav-item {
    padding: 6px 12px;
    font-size: 13px;
    gap: 4px;
  }

  .dashboard-main {
    height: calc(100vh - 60px);
  }

  /* 隱藏左側器材庫與側邊欄 toggle 按鈕 */
  .sidebar-left-wrapper,
  .sidebar-left,
  .sidebar-toggle-btn {
    display: none !important;
  }

  /* 隱藏畫布上方的網格調整與縮放工具 */
  .canvas-header-controls {
    display: none !important;
  }

  .canvas-header {
    justify-content: center;
    text-align: center;
    margin-bottom: 8px;
  }

  .canvas-header h2 {
    font-size: 18px;
  }
}
```

### B. 數據分析頁面堆疊 (`@media (max-width: 768px)`)
```css
@media (max-width: 768px) {
  /* 當在數據分析分頁時，主容器改為垂直堆疊且允許網頁滾動 */
  .dashboard-main.tab-analytics {
    flex-direction: column;
    overflow-y: auto;
    height: auto;
    min-height: calc(100vh - 60px);
  }

  /* 數據分析左面板（肌肉熱度圖、折線圖）取消獨立滾動，隨主頁面滾動 */
  .dashboard-main.tab-analytics section {
    overflow-y: visible !important;
    padding: 16px !important;
  }

  /* 右側數據欄（PR 列表、活躍度）寬度變為 100%，並接在下方 */
  .sidebar-right {
    width: 100% !important;
    border-left: none !important;
    border-top: 1px solid var(--border-dark) !important;
    height: auto !important;
    overflow-y: visible !important;
    padding-bottom: 32px !important;
  }

  .analytics-card {
    margin: 8px 12px !important;
    padding: 14px !important;
  }
}
```

### C. 訓練紀錄視窗防擠壓 (`@media (max-width: 480px)`)
```css
@media (max-width: 480px) {
  .modal-content {
    max-width: calc(100% - 24px) !important;
    margin: 12px;
  }

  .modal-header,
  .modal-body {
    padding: 16px !important;
  }

  /* 微調記錄行內各欄位比例，保證重量與次數輸入框有最大空間 */
  .modal-body form > div:nth-child(2) > div,
  .modal-body form > div:nth-child(3) {
    gap: 4px !important;
  }
}
```

---

## 4. 驗證條件 (Verification Criteria)

1. **編譯驗證**: 執行 `npm run build` 能夠順利通過編譯，無 TypeScript 與打包錯誤。
2. **視覺驗證**: 
   - 桌機模式下，側邊欄、拖曳網格與數據分析的功能運作與樣式不受影響。
   - 手機模式下（透過瀏覽器 DevTools 模擬 375px 寬度）：
     - 頂部導覽列無溢出或斷行。
     - 左側器材庫消失，畫布水平居中。
     - 畫布上方無網格維度設定和縮放拉桿。
     - 切換到 Workout Analytics 時，圖表與 PR 列表上下堆疊，可順暢往下滑動。
     - 開啟訓練紀錄視窗時，視窗能完整適應螢幕寬度，輸入欄位能正常觸控輸入。

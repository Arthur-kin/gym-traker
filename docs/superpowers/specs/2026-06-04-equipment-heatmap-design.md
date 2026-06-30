# Gymformer 器材使用熱度圖設計規格書

本文件定義了 Gymformer 2D 佈局畫布上的「器材使用熱度圖 (Equipment Usage Heatmap)」功能。

## 1. 功能設計與定位

- **功能目的**：在 2D 佈局網格畫布上，根據過去 30 天內各器材被記錄訓練的頻率，讓常用器材的外框散發出不同強度的金黃色微光，直觀呈現器材使用熱度。
- **介面開關**：在畫布頂部控制區（`canvas-header`）新增一個「🔥 熱度分析」切換按鈕，可隨時開啟或關閉此視覺效果（在手機版與電腦版皆可切換）。
- **視覺規範**：
  - 不顯示數字角標，維持畫面簡潔度。
  - 使用次數大於 0 的器材，外框會高亮，且向外散發金黃色光暈（Box Shadow）。
  - 使用次數最多的器材，光暈半徑最大且顏色最濃。
  - 加上極淡的金色底色（最高 8% 不透明度），既能提升熱度填滿感，又不影響器材圖示清晰度。

## 2. 數據流與傳遞

1. **`App.tsx` 傳遞日誌**：
   將全局的 `workoutLogs` 傳入 `GymCanvas`：
   ```typescript
   <GymCanvas logs={workoutLogs} ... />
   ```
2. **`GymCanvas.tsx` 計算頻率**：
   過濾出近 30 天內的日誌，計算各器材實例的累積次數並求得最高次數 `maxUsage` 作為對比基底。

## 3. 樣式實作細節

當開啟熱度圖模式（`showHeatmap` 為 `true`）且器材有使用紀錄時，對 `.placed-equipment-node` 動態套用以下樣式：
```typescript
const heatmapStyle = showHeatmap && usageCount > 0 ? {
  borderColor: `rgba(204, 163, 83, ${0.4 + ratio * 0.6})`,
  borderWidth: `${1.5 + ratio * 1.5}px`,
  boxShadow: `0 0 ${8 + ratio * 20}px rgba(204, 163, 83, ${0.25 + ratio * 0.55})`,
  backgroundColor: `rgba(204, 163, 83, ${ratio * 0.08})`,
} : {};
```

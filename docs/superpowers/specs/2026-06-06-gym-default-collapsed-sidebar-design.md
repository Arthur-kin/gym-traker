# 2D 健身房畫布側邊欄預設收合設計規格

本設計規格旨在調整左側器材庫（Equipment Library Sidebar）的初始化狀態，改為預設收合，以便使用者在進入系統時能夠獲得最大化且無干擾的畫布視野。

---

## 1. 變更目標與範疇
* **目標**：當網頁首次加載時，左側器材庫側邊欄（`sidebar-left-wrapper`）將呈現收合（Collapsed）狀態，寬度為 `0px`。
* **影響範圍**：
  * 主要受影響的 React 組件：[GymCanvas.tsx](file:///opt/gym-tracker/frontend/src/components/GymCanvas.tsx)

---

## 2. 詳細設計與程式碼變更

在 [GymCanvas.tsx](file:///opt/gym-tracker/frontend/src/components/GymCanvas.tsx) 中，管理側邊欄收合狀態的 React State 原先定義如下：

```typescript
// 修改前 (展開狀態)
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
```

我們將其初始化數值變更為 `true`：

```typescript
// 修改後 (收合狀態)
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
```

### 變更後的 UI 反饋機制：
* **側邊欄寬度**：初始渲染時為 `0px`（CSS 轉場過渡效果將維持平滑）。
* **側邊欄內容透明度**：內容部分將具有 `opacity: 0`。
* **按鈕圖示與 Title**：
  * 按鈕位置將靠在最左側（`left: 0px`）。
  * 箭頭圖標顯示為指向右側（`ChevronRight`），意指「展開器材庫」。
  * 按鈕 Hover 的 Title 標籤調整為 `"展開器材庫"`。

---

## 3. 驗證條件與測試
1. **編譯驗證**：前端執行 `npm run build` 成功。
2. **行為驗證**：進入網頁時，左側側邊欄預設收合，中央畫布主體自動寬度延展；點擊左側金色箭頭按鈕後能流暢展開。

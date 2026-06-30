# 2D 健身房畫布側邊欄預設收合實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 2D 畫布左側的器材庫側邊欄（Equipment Library Sidebar）變更為預設收合狀態。

**Architecture:** 變更 `GymCanvas.tsx` 組件中 `isSidebarCollapsed` 狀態的 useState 預設初始化為 `true`，使頁面首次渲染時，Nginx / Vite 動態加載直接呈現寬度為 0px 且隱藏內容的收合狀態。

**Tech Stack:** React, TypeScript

---

### Task 1: 修改 GymCanvas 側邊欄狀態初始化

**Files:**
- Modify: `/opt/gym-tracker/frontend/src/components/GymCanvas.tsx`

- [ ] **Step 1: 修改 useState 預設值**

  在 `/opt/gym-tracker/frontend/src/components/GymCanvas.tsx` 的第 333 行附近，修改狀態：

  將原本的：
  ```typescript
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  ```

  修改為：
  ```typescript
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  ```

- [ ] **Step 2: 進行前端編譯**

  Run: `npm run build` inside `/opt/gym-tracker/frontend`
  Expected: Build completes successfully with exit code 0.

- [ ] **Step 3: 提交變更到 Git**

  Run:
  ```bash
  git add frontend/src/components/GymCanvas.tsx
  git commit -m "feat(frontend): default equipment library sidebar to collapsed state"
  ```

---

### Task 2: 重新部署與端到端驗證

**Files:**
- None

- [ ] **Step 1: 重建 Docker 容器**

  Run: `docker compose up -d --build` inside `/opt/gym-tracker`
  Expected: Containers are recreated and running successfully.

- [ ] **Step 2: 驗證 API 與首頁渲染**

  透過瀏覽器造訪網頁，驗證左側器材庫確實預設為收合狀態，且點擊右緣金色小箭頭能夠順暢展開。

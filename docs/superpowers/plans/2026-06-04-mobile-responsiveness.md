# Gymformer Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement mobile responsiveness for Gymformer, optimizing navigation, hiding sidebars/controls on mobile, stacking analytics graphs vertically, and adjusting the workout logger modal.

**Architecture:** Add dynamic tab class name to main dashboard wrapper in React. Annotate wrapper divs in GymCanvas with semantic class names. Add CSS media query styles to the end of `index.css`.

**Tech Stack:** React, CSS, TypeScript.

---

### Task 1: Update App.tsx Container Class

**Files:**
- Modify: `frontend/src/App.tsx:204-206`
- Test: Build compilation check

- [ ] **Step 1: Add dynamic class name to the main tag**

Change the rendering wrapper of the main dashboard (around line 204) to include the active tab name:
```diff
-        <main className="dashboard-main">
+        <main className={`dashboard-main tab-${activeTab}`}>
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 2: Annotate GymCanvas.tsx Wrapper Elements

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:428-435`, `frontend/src/components/GymCanvas.tsx:627-630`, `frontend/src/components/GymCanvas.tsx:653-656`
- Test: Build compilation check

- [ ] **Step 1: Annotate Left Sidebar wrapper container**

Locate the outer wrapper `div` of the sidebar (around line 429) and add `className="sidebar-left-wrapper"` to it:
```typescript
      {/* Left Sidebar - Collapsible Equipment Library */}
      <div 
        className="sidebar-left-wrapper"
        style={{ position: 'relative', display: 'flex', height: '100%', zIndex: 10, flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', width: isSidebarCollapsed ? '0px' : '280px' }}
      >
```

- [ ] **Step 2: Annotate Left Sidebar collapse toggle button**

Locate the collapse toggle button `button` (around line 627) and add `className="sidebar-toggle-btn"` to it:
```typescript
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
```

- [ ] **Step 3: Annotate Canvas Header dimension and zoom controls container**

Locate the wrapper `div` containing the Column/Row inputs and the zoom slider (around line 653) and add `className="canvas-header-controls"` to it:
```typescript
          <div className="canvas-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Grid dimension inputs */}
```

- [ ] **Step 4: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 3: Implement Mobile Responsive CSS Media Queries in index.css

**Files:**
- Modify: `frontend/src/index.css:537` (append to end of file)
- Test: Build compilation check

- [ ] **Step 1: Append mobile styles to index.css**

Append the following responsive style block to the end of `index.css`:
```css
/* ==========================================================================
   Mobile Responsiveness & Media Queries
   ========================================================================== */

@media (max-width: 768px) {
  /* 1. Header Optimization */
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

  /* Hide subtitle "/ Layout & Track" on mobile */
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

  /* 2. Hide sidebars & toggle button for drag and drop */
  .sidebar-left-wrapper,
  .sidebar-left,
  .sidebar-toggle-btn {
    display: none !important;
  }

  /* 3. Hide grid customizer controls and center header */
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

  /* 4. Stacking and Scroll for Analytics Dashboard */
  .dashboard-main.tab-analytics {
    flex-direction: column;
    overflow-y: auto;
    height: auto;
    min-height: calc(100vh - 60px);
  }

  /* Disable left panel scroll so page scrolls as a single unit */
  .dashboard-main.tab-analytics section {
    overflow-y: visible !important;
    padding: 16px !important;
  }

  /* Right column stacks under the left chart panel */
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

@media (max-width: 480px) {
  /* 5. Workout Logger Modal Adjustments */
  .modal-content {
    max-width: calc(100% - 24px) !important;
    margin: 12px;
  }

  .modal-header,
  .modal-body {
    padding: 16px !important;
  }

  /* Grid details adjustments inside modal for inputs compression */
  .modal-body form > div:nth-child(2) > div,
  .modal-body form > div:nth-child(3) {
    gap: 4px !important;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 4: Rebuild & Restart Container

**Files:**
- Modify: None
- Test: Docker Build and Container Restart Verification

- [ ] **Step 1: Rebuild and restart the container**

Run: `docker compose up -d --build gym-frontend` inside `/opt/gym-tracker`
Expected: Container successfully built and running

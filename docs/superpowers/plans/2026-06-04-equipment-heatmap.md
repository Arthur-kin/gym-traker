# Gymformer Equipment Usage Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 30-day equipment usage heatmap on the 2D gym layout grid. Equipment nodes will glow gold based on their workout log frequency in the last 30 days. Add a toggle button in the header to switch the effect on/off.

**Architecture:** Pass `workoutLogs` down from `App.tsx` to `GymCanvas.tsx`. Calculate log counts per equipment and find the maximum log frequency in `GymCanvas.tsx`. Add a toggle button to the canvas header and apply dynamic inline styles (box-shadow, border-color, background-color) to placed equipment nodes.

**Tech Stack:** React, CSS, TypeScript.

---

### Task 1: Pass Logs from App.tsx to GymCanvas

**Files:**
- Modify: `frontend/src/App.tsx:206-210`
- Test: Build compilation check

- [ ] **Step 1: Pass workoutLogs down as a prop**

Locate the `GymCanvas` rendering inside `App.tsx` (around line 206) and pass the `workoutLogs` state to the `logs` prop:
```diff
           {activeTab === 'layout' ? (
             <GymCanvas
               layout={layout || { id: 'default', name: 'My Home Gym', width: 8, height: 6, equipment: [] }}
+              logs={workoutLogs}
               onChangeLayout={setLayout}
               onSelectEquipment={setSelectedEquipment}
             />
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile error due to `logs` prop not existing on `GymCanvas` yet.

---

### Task 2: Update GymCanvasProps Interface & Calculate Usage Frequencies

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:5-15`, `frontend/src/components/GymCanvas.tsx:300-310`
- Test: Build compilation check

- [ ] **Step 1: Add logs to GymCanvasProps**

Locate `GymCanvasProps` interface at the top of the file and add `logs?: WorkoutLog[];` to it:
```typescript
interface GymCanvasProps {
  layout: GymLayout;
  logs?: WorkoutLog[];
  onChangeLayout: (newLayout: GymLayout) => void;
  onSelectEquipment: (equipment: PlacedEquipment) => void;
  onChangeZoom?: (zoom: number) => void;
}
```

- [ ] **Step 2: Add state and useMemo calculation hooks**

Locate the start of the `GymCanvas` component function and define the `showHeatmap` state along with the `useMemo` hooks to calculate equipment usage and max usage:
```typescript
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Calculate workout logs count in the last 30 days per equipment
  const equipmentUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!logs) return counts;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    logs.forEach(log => {
      const logDate = new Date(log.loggedAt);
      if (logDate >= thirtyDaysAgo && log.equipmentId) {
        counts[log.equipmentId] = (counts[log.equipmentId] || 0) + 1;
      }
    });
    return counts;
  }, [logs]);

  // Find the maximum usage frequency to normalize proportions
  const maxUsage = useMemo(() => {
    const values = Object.values(equipmentUsage);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  }, [equipmentUsage]);
```

- [ ] **Step 3: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 3: Render Heatmap Toggle Button in Canvas Header

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:645-665`
- Test: Build compilation check

- [ ] **Step 1: Add the toggle button in the header**

Locate the grid columns / rows dimension container inside `canvas-header` (around line 655) and insert the toggle button right next to the title or dimensions wrapper:
```typescript
        <div className="canvas-header">
          <div className="canvas-title-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2>{layout.name} <span>({layout.width}x{layout.height} Grid Layout)</span></h2>
            
            {/* Heatmap Toggle Button */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: showHeatmap ? 'var(--gold-primary)' : 'rgba(204, 163, 83, 0.08)',
                color: showHeatmap ? 'var(--bg-panel)' : 'var(--gold-primary)',
                border: '1px solid var(--border-gold)',
                borderRadius: '20px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxShadow: showHeatmap ? '0 0 10px rgba(204, 163, 83, 0.3)' : 'none'
              }}
            >
              <span style={{ fontSize: '12px' }}>🔥</span>
              {showHeatmap ? '隱藏使用熱度' : '顯示使用熱度'}
            </button>
          </div>
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 4: Apply Heatmap Glow Styles to Equipment Nodes

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:734-755`
- Test: Build compilation check

- [ ] **Step 1: Calculate and merge heatmap styles on nodes**

Locate the `layout.equipment.map` rendering loop (around line 734). Inside the loop, compute the dynamic node style and merge it with the inline style of the placed equipment node wrapper:
```typescript
          {/* Placed equipment */}
          {layout.equipment.map((eq, index) => {
            const isSelected = selectedNodeId === `${eq.gridX}-${eq.gridY}`;
            const key = eq.id ? `placed-${eq.id}` : `placed-temp-${index}`;
            const nodeSize = cellSize - 6;
            const nodeOffset = 3;
            
            const usageCount = equipmentUsage[eq.id || ''] || 0;
            const ratio = maxUsage > 0 ? usageCount / maxUsage : 0;
            
            // Dynamic golden heatmap style
            const heatmapStyle = showHeatmap && usageCount > 0 ? {
              borderColor: `rgba(204, 163, 83, ${0.4 + ratio * 0.6})`,
              borderWidth: `${1.5 + ratio * 1.5}px`,
              boxShadow: `0 0 ${8 + ratio * 20}px rgba(204, 163, 83, ${0.25 + ratio * 0.55})`,
              backgroundColor: `rgba(204, 163, 83, ${ratio * 0.08})`,
            } : {};

            return (
              <div
                key={key}
                className={`placed-equipment-node ${isSelected ? 'selected' : ''}`}
                style={{
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  left: `${eq.gridX * cellSize + nodeOffset}px`,
                  top: `${eq.gridY * cellSize + nodeOffset}px`,
                  transform: `rotate(${eq.rotation}deg)`,
                  ...heatmapStyle // Merge heatmap styles
                }}
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile success

---

### Task 5: Rebuild & Restart Container

**Files:**
- Modify: None
- Test: Docker Build and Container Restart Verification

- [ ] **Step 1: Rebuild and restart the container**

Run: `docker compose up -d --build gym-frontend` inside `/opt/gym-tracker`
Expected: Container successfully built and running

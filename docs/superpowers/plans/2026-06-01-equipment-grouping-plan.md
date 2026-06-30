# Equipment Grouping & Custom Muscle Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Categorize the gym equipment library into three distinct sections (Free Weights, Strength Machines, Cardio) with collapsible golden-accented headers, set free weight templates to have flexible target muscle groups (defaulting to 'ANY'), and fix the backend database updating logic for muscle groups.

**Architecture:** We will extend the `EQUIPMENT_TEMPLATES` in `GymCanvas.tsx` to support a `category` attribute, implement component-level toggles for collapsible sections, and update backend's `prisma.placedEquipment.update` to include `muscleGroup`.

**Tech Stack:** React, TypeScript, Express, Prisma, PostgreSQL

---

### Task 1: Backend Database Update Fix

**Files:**
- Modify: `backend/src/server.ts:75-83`

- [ ] **Step 1: Modify backend code**
Update `backend/src/server.ts` to include `muscleGroup: eq.muscleGroup` in the Prisma update call for existing equipment:
```typescript
          // 已存在的器材，更新座標、角度與名稱
          const updated = await tx.placedEquipment.update({
            where: { id: eq.id },
            data: {
              customName: eq.customName,
              muscleGroup: eq.muscleGroup,
              gridX: eq.gridX,
              gridY: eq.gridY,
              rotation: eq.rotation,
            }
          });
```

- [ ] **Step 2: Restart backend and verify it compiles**
Restart backend and check that it launches successfully without database schema or compile errors.

- [ ] **Step 3: Commit change**
```bash
git add backend/src/server.ts
git commit -m "fix(backend): persist muscleGroup updates for existing placed equipment"
```

---

### Task 2: Equipment Template Categories Definition

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:201-224`

- [ ] **Step 1: Add categories and update muscle group defaults**
Modify the `EQUIPMENT_TEMPLATES` array in `frontend/src/components/GymCanvas.tsx` to add `category: 'free_weight' | 'machine' | 'cardio'` and update free weight defaults to `'ANY'`:
```typescript
const EQUIPMENT_TEMPLATES = [
  // SportsArt strength machines (Dual Function)
  { type: 'DF300', customName: 'SportsArt DF300 Leg Extension/Curl', muscleGroup: 'LEGS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-300-Leg-Extension-Curl-web-375x400.png' },
  { type: 'DF301', customName: 'SportsArt DF301 Leg Press/Calf', muscleGroup: 'LEGS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-301-Leg-Press-Calf-Extension-web-375x400.png' },
  { type: 'DF303', customName: 'SportsArt DF303 Lat Pull/Row', muscleGroup: 'BACK', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-303-Lat-Pulldown-Mid-Row-web-375x400.png' },
  { type: 'DF304', customName: 'SportsArt DF304 Pec Fly/Delt', muscleGroup: 'CHEST', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-304-Pec-Fly-Rear-Deltoid-web-375x400.png' },
  { type: 'DF305', customName: 'SportsArt DF305 Bicep/Tricep', muscleGroup: 'ARMS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-305-Bicep-Tricep-web-375x400.png' },
  { type: 'DF308', customName: 'SportsArt DF308 Multi Press', muscleGroup: 'CHEST', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-308-Multi-Press-web-375x400.png' },
  { type: 'DS972', customName: 'SportsArt DS972 Cable Trainer', muscleGroup: 'BACK', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/DS972-1-375x400.png' },
  
  // Single function S900 Series
  { type: 'N915', customName: 'SportsArt N915 Chest Press', muscleGroup: 'CHEST', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N915-Independent-Chest-Press-1000x667_300-375x400.png' },
  { type: 'N916', customName: 'SportsArt N916 Lat Pulldown', muscleGroup: 'BACK', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N916-Independent-Lat-Pulldown-1000x667_300-375x400.png' },
  { type: 'N917', customName: 'SportsArt N917 Shoulder Press', muscleGroup: 'SHOULDERS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N917-Independent-Shoulder-Press-1000x667_300-375x400.png' },
  { type: 'N918', customName: 'SportsArt N918 Low Row', muscleGroup: 'BACK', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N918-Low-Row-1000x667_300-375x400.png' },
  { type: 'N957', customName: 'SportsArt N957 Leg Extension', muscleGroup: 'LEGS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N957-Leg-Extension-1000x667_300-375x400.png' },
  
  // Cardio & Free Weights
  { type: 'T665', customName: 'SportsArt T665 Treadmill', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2024/10/T665-01-web-375x400.png' },
  { type: 'POWER_RACK', customName: 'Power Rack', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'BENCH_PRESS', customName: 'Bench Press', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'DUMBBELLS', customName: 'Dumbbells', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'KETTLEBELLS', customName: 'Kettlebells', muscleGroup: 'ANY', category: 'free_weight' }
];
```

- [ ] **Step 2: Commit changes**
```bash
git add frontend/src/components/GymCanvas.tsx
git commit -m "feat(frontend): categorize equipment templates and default free weights to ANY muscle group"
```

---

### Task 3: Collapsible & Grouped Sidebar UI

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:226-382`

- [ ] **Step 1: Add expandedCategories state inside GymCanvas**
```typescript
  const [expandedCategories, setExpandedCategories] = useState({
    free_weight: true,
    machine: true,
    cardio: true
  });
```

- [ ] **Step 2: Render sidebar grouped sections**
Replace the flat rendering list with three sections inside the sidebar (`aside.sidebar-left` under the search bar container). Add collapsible headers with chevron arrows:
```typescript
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* 1. Free Weights */}
          <div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, free_weight: !prev.free_weight }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: 'rgba(204, 163, 83, 0.1)',
                borderLeft: '3px solid var(--gold-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--gold-primary)',
                marginBottom: '8px',
                borderRadius: '0 4px 4px 0',
                userSelect: 'none'
              }}
            >
              <span>🏋️ 自由重量 (Free Weights)</span>
              <span style={{ fontSize: '10px' }}>{expandedCategories.free_weight ? '▲' : '▼'}</span>
            </div>
            {expandedCategories.free_weight && (
              <div className="library-grid">
                {filteredTemplates.filter(t => t.category === 'free_weight').map((template) => (
                  <div
                    key={template.type}
                    className="library-item"
                    draggable
                    onDragStart={(e) => handleDragStartFromLibrary(e, template)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }} className="library-item-icon">
                      {template.imageUrl ? (
                        <img src={template.imageUrl} alt={template.customName} style={{ height: '38px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(204, 163, 83, 0.2))' }} />
                      ) : (
                        <GoldIcon type={template.type} size={36} />
                      )}
                    </div>
                    <span className="library-item-name">{template.customName}</span>
                  </div>
                ))}
                {filteredTemplates.filter(t => t.category === 'free_weight').length === 0 && (
                  <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>無匹配器材</div>
                )}
              </div>
            )}
          </div>

          {/* 2. Strength Machines */}
          <div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, machine: !prev.machine }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: 'rgba(204, 163, 83, 0.1)',
                borderLeft: '3px solid var(--gold-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--gold-primary)',
                marginBottom: '8px',
                borderRadius: '0 4px 4px 0',
                userSelect: 'none'
              }}
            >
              <span>🤖 固定器械 (Strength Machines)</span>
              <span style={{ fontSize: '10px' }}>{expandedCategories.machine ? '▲' : '▼'}</span>
            </div>
            {expandedCategories.machine && (
              <div className="library-grid">
                {filteredTemplates.filter(t => t.category === 'machine').map((template) => (
                  <div
                    key={template.type}
                    className="library-item"
                    draggable
                    onDragStart={(e) => handleDragStartFromLibrary(e, template)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }} className="library-item-icon">
                      {template.imageUrl ? (
                        <img src={template.imageUrl} alt={template.customName} style={{ height: '38px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(204, 163, 83, 0.2))' }} />
                      ) : (
                        <GoldIcon type={template.type} size={36} />
                      )}
                    </div>
                    <span className="library-item-name">{template.customName}</span>
                  </div>
                ))}
                {filteredTemplates.filter(t => t.category === 'machine').length === 0 && (
                  <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>無匹配器材</div>
                )}
              </div>
            )}
          </div>

          {/* 3. Cardio & Other */}
          <div>
            <div 
              onClick={() => setExpandedCategories(prev => ({ ...prev, cardio: !prev.cardio }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: 'rgba(204, 163, 83, 0.1)',
                borderLeft: '3px solid var(--gold-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--gold-primary)',
                marginBottom: '8px',
                borderRadius: '0 4px 4px 0',
                userSelect: 'none'
              }}
            >
              <span>🏃 有氧訓練 (Cardio & Other)</span>
              <span style={{ fontSize: '10px' }}>{expandedCategories.cardio ? '▲' : '▼'}</span>
            </div>
            {expandedCategories.cardio && (
              <div className="library-grid">
                {filteredTemplates.filter(t => t.category === 'cardio').map((template) => (
                  <div
                    key={template.type}
                    className="library-item"
                    draggable
                    onDragStart={(e) => handleDragStartFromLibrary(e, template)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }} className="library-item-icon">
                      {template.imageUrl ? (
                        <img src={template.imageUrl} alt={template.customName} style={{ height: '38px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(204, 163, 83, 0.2))' }} />
                      ) : (
                        <GoldIcon type={template.type} size={36} />
                      )}
                    </div>
                    <span className="library-item-name">{template.customName}</span>
                  </div>
                ))}
                {filteredTemplates.filter(t => t.category === 'cardio').length === 0 && (
                  <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>無匹配器材</div>
                )}
              </div>
            )}
          </div>
        </div>
```

- [ ] **Step 3: Test collapsible behavior in the browser**
Load `http://localhost:3000` (or `http://localhost:8085` via cloudflare tunnel if that is where you access), test:
- Search field filters items within their categories correctly.
- Clicking any header collapses/expands the corresponding category.
- Dragging items onto the gym canvas still functions properly.

- [ ] **Step 4: Commit UI changes**
```bash
git add frontend/src/components/GymCanvas.tsx
git commit -m "feat(frontend): implement collapsible grouped sections for the equipment library"
```

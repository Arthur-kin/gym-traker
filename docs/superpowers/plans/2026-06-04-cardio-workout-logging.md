# Cardio Workout Logging & Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the workout logger and analytics page to dynamically present cardio-centric inputs and charts for cardio machines.

**Architecture:** Change labels, placeholders, input validations, and unit displays in `WorkoutLogger.tsx` and `AnalyticsCharts.tsx` depending on the `CARDIO` category/muscleGroup.

**Tech Stack:** React, TypeScript, Docker Compose.

---

### Task 1: Dynamically Update WorkoutLogger.tsx for Cardio

**Files:**
- Modify: `frontend/src/components/WorkoutLogger.tsx`
- Test: Compile check in frontend

- [ ] **Step 1: Check for Cardio category**

At the top of `WorkoutLogger` render function (around line 184):
```typescript
  const isCardio = equipment.muscleGroup === 'CARDIO';
```

- [ ] **Step 2: Update Table Headers**

Change headers dynamically (around line 189-195):
```typescript
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px 40px', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', textAlign: 'center' }}>
              <div>Set</div>
              <div>{isCardio ? 'Distance' : 'Weight'}</div>
              <div>{isCardio ? 'Time' : 'Reps'}</div>
              <div>{isCardio ? 'Level/HR' : 'RPE'}</div>
              <div></div>
            </div>
```

- [ ] **Step 3: Update Inputs (Placeholders and validation constraints)**

Update inputs inside `sets.map` loop (around line 210-244):
- Weight input placeholder: `placeholder={isCardio ? "km" : "kg/lbs"}`
- Reps input placeholder: `placeholder={isCardio ? "mins" : "reps"}`
- RPE input placeholder: `placeholder={isCardio ? "BPM/Lvl" : "1-10"}`
- Remove `min="1" max="10"` on RPE input if `isCardio` is true:
  ```typescript
                  <input
                    type="number"
                    {...(!isCardio ? { min: 1, max: 10 } : {})}
                    className="equipment-search"
                    style={{ backgroundColor: '#fff', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                    placeholder={isCardio ? "BPM/Lvl" : "1-10"}
                    value={set.rpe}
                    onChange={(e) => handleInputChange(idx, 'rpe', e.target.value)}
                  />
  ```

- [ ] **Step 4: Update History Log Display**

Update sets detail rendering in the history log (around line 348-355):
```typescript
                      {/* Sets Detail */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: log.notes ? '6px' : '0' }}>
                        {log.sets.map((s) => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--gold-dark)' }}>Set {s.setNumber}:</span>
                            {isCardio ? (
                              <span>{s.weight} km × {s.reps} mins</span>
                            ) : (
                              <span>{s.weight} × {s.reps} reps</span>
                            )}
                            {s.rpe && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', fontStyle: 'italic' }}>
                                {isCardio ? `(Lvl/HR: ${s.rpe})` : `(RPE ${s.rpe})`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
```

---

### Task 2: Dynamically Update AnalyticsCharts.tsx for Cardio

**Files:**
- Modify: `frontend/src/components/AnalyticsCharts.tsx`
- Test: Compile check in frontend

- [ ] **Step 1: Check for Cardio category in Progression Data calculation**

In `progressData` useMemo computation (around line 77-89), dynamically compute session load and max values:
```typescript
      const isCardioGroup = eqGroup === 'CARDIO';
      let sessionMax = 0;
      let sessionLoad = 0;
      if (isCardioGroup) {
        sessionMax = log.sets.reduce((max, s) => s.weight > max ? s.weight : max, 0); // max distance
        sessionLoad = log.sets.reduce((sum, s) => sum + s.reps, 0); // total duration in minutes
      } else {
        sessionMax = log.sets.reduce((max, s) => s.weight > max ? s.weight : max, 0);
        sessionLoad = log.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
      }
```

- [ ] **Step 2: Update Line Chart Tooltip Units**

In `renderLineChartTooltip` (around line 153-160):
```typescript
          <p style={{ color: 'var(--gold-primary)', margin: '2px 0' }}>
            {selectedMuscle === 'CARDIO' ? '最高距離 (Max Distance)' : '最高重量 (Max Weight)'}: <strong>{payload[0].value} {selectedMuscle === 'CARDIO' ? 'km' : 'kg'}</strong>
          </p>
          {payload[1] && (
            <p style={{ color: 'var(--text-light)', opacity: 0.8, margin: '2px 0' }}>
              {selectedMuscle === 'CARDIO' ? '總運動時間 (Total Duration)' : '單次總載重 (Total Load)'}: <strong>{payload[1].value} {selectedMuscle === 'CARDIO' ? 'mins' : 'kg'}</strong>
            </p>
          )}
```

- [ ] **Step 3: Update Line Chart Y-Axis Labels and Line Names**

In the LineChart component rendering (around line 440-470):
- Left YAxis label: `value: selectedMuscle === 'CARDIO' ? '最高距離 (km)' : '最高重量 (kg)'`
- Right YAxis label: `value: selectedMuscle === 'CARDIO' ? '總運動時間 (mins)' : '總訓練量 (kg)'`
- Left Line name: `name={selectedMuscle === 'CARDIO' ? '最高距離 (Max Distance)' : '最高重量 (Max Weight)'}`
- Right Line name: `name={selectedMuscle === 'CARDIO' ? '總運動時間 (Total Duration)' : '單次總負荷量 (Total Load)'}`

- [ ] **Step 4: Update Personal Records (PR) Units**

In the PR list render (around line 545-551):
```typescript
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                      {pr.weight} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted-light)' }}>{pr.muscleGroup === 'CARDIO' ? 'km' : 'kg'}</span>
                    </div>
                    <ArrowRight size={10} style={{ color: 'var(--text-muted-light)' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500 }}>
                      {pr.reps} {pr.muscleGroup === 'CARDIO' ? 'mins' : 'reps'}
                    </div>
```

---

### Task 3: Compile Verification & Docker Rebuild

**Files:**
- Modify: None
- Test: Compile check, Docker Compose build check

- [ ] **Step 1: Compile verification check**

Run: `npm run build` inside `/opt/gym-tracker/frontend`
Expected: Success

- [ ] **Step 2: Restart Docker Container**

Run: `docker compose up -d --build gym-frontend` inside `/opt/gym-tracker`
Expected: Container successfully built and restarted

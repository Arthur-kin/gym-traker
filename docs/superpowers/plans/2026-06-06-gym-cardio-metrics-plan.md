# Gymformer Cardio Metrics Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cardio metrics tracking (incline, resistance, and heart rate) with dynamic form rendering based on the equipment type.

**Architecture:** Update the PostgreSQL database schema (`WorkoutSet` model) via Prisma, update the backend REST endpoints to parse the new optional fields, and update the frontend React components to support type extensions, dynamic grid layouts, placeholders, and formatted workout history listings.

**Tech Stack:** React, TypeScript, Express, Prisma, PostgreSQL, Docker

---

### Task 1: Database Schema Migration & Backend API Update

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Modify schema.prisma to add optional cardio fields**

In [backend/prisma/schema.prisma](file:///opt/gym-tracker/backend/prisma/schema.prisma), modify the `WorkoutSet` model to add optional fields `incline` (Float?), `resistance` (Int?), and `heartRate` (Int?).

```prisma
model WorkoutSet {
  id           String     @id @default(uuid())
  logId        String
  log          WorkoutLog @relation(fields: [logId], references: [id], onDelete: Cascade)
  setNumber    Int        // 第幾組 (1, 2, 3...)
  weight       Float      // 重量 (kg 或 lbs)
  reps         Int        // 次數
  rpe          Int?       // 自覺強度 (1-10)
  incline      Float?     // 有氧坡度 (%)
  resistance   Int?       // 有氧阻力段數 (Level)
  heartRate    Int?       // 有氧平均心率 (BPM)
}
```

- [ ] **Step 2: Run Prisma generate and database push locally to apply changes**

Run Prisma code generation and sync the schema change to the running PostgreSQL database.
Run: `npm run prisma:generate && npm run prisma:migrate` in the `/opt/gym-tracker/backend` directory.
Expected output: Prisma Client generated successfully and database schema pushed/synchronized.

- [ ] **Step 3: Modify backend server.ts to parse optional cardio fields**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), update the `POST /api/logs` and `PUT /api/logs/:id` handlers to map `incline`, `resistance`, and `heartRate` fields.

Modify the `POST /api/logs` block around line 151:
```typescript
          create: sets.map((s: any, idx: number) => ({
            setNumber: s.setNumber || (idx + 1),
            weight: parseFloat(s.weight),
            reps: parseInt(s.reps),
            rpe: s.rpe ? parseInt(s.rpe) : null,
            incline: s.incline ? parseFloat(s.incline) : null,
            resistance: s.resistance ? parseInt(s.resistance) : null,
            heartRate: s.heartRate ? parseInt(s.heartRate) : null
          }))
        }
```

Modify the `PUT /api/logs/:id` block around line 194:
```typescript
            create: sets.map((s: any, idx: number) => ({
              setNumber: s.setNumber || (idx + 1),
              weight: parseFloat(s.weight),
              reps: parseInt(s.reps),
              rpe: s.rpe ? parseInt(s.rpe) : null,
              incline: s.incline ? parseFloat(s.incline) : null,
              resistance: s.resistance ? parseInt(s.resistance) : null,
              heartRate: s.heartRate ? parseInt(s.heartRate) : null
            }))
```

- [ ] **Step 4: Verify backend compilation**

Run: `npm run build` in the `/opt/gym-tracker/backend` directory.
Expected: Compilation completes successfully.

- [ ] **Step 5: Commit backend changes**

Run:
```bash
git add backend/prisma/schema.prisma backend/src/server.ts
git commit -m "feat(backend): add optional cardio metrics and support parsing in logs API"
```

---

### Task 2: Frontend Data Type Extensions

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/WorkoutLogger.tsx`

- [ ] **Step 1: Extend App.tsx WorkoutSet and Callback signatures**

In [frontend/src/App.tsx](file:///opt/gym-tracker/frontend/src/App.tsx), update the `WorkoutSet` interface to include optional fields, and update the parameter signatures of `handleAddLog` and `handleUpdateLog`.

Modify lines 25-31:
```typescript
export interface WorkoutSet {
  id?: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  incline?: number | null;
  resistance?: number | null;
  heartRate?: number | null;
}
```

Modify `handleAddLog` signature:
```typescript
  const handleAddLog = async (logData: {
    equipmentId: string;
    sets: { 
      setNumber: number; 
      weight: number; 
      reps: number; 
      rpe?: number | null;
      incline?: number | null;
      resistance?: number | null;
      heartRate?: number | null;
    }[];
    notes?: string;
  }) => {
```

Modify `handleUpdateLog` signature:
```typescript
  const handleUpdateLog = async (logId: string, logData: {
    sets: { 
      setNumber: number; 
      weight: number; 
      reps: number; 
      rpe?: number | null;
      incline?: number | null;
      resistance?: number | null;
      heartRate?: number | null;
    }[];
    notes?: string;
  }) => {
```

- [ ] **Step 2: Extend WorkoutLogger.tsx component props and SetInput interfaces**

In [frontend/src/components/WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx), update the callback types inside `WorkoutLoggerProps` and update the `SetInput` interface to support optional cardio fields as string values.

Modify lines 10-18:
```typescript
  onAddLog: (logData: {
    equipmentId: string;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      rpe?: number | null;
      incline?: number | null;
      resistance?: number | null;
      heartRate?: number | null;
    }[];
    notes?: string;
  }) => Promise<boolean>;
  onUpdateLog?: (logId: string, logData: {
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      rpe?: number | null;
      incline?: number | null;
      resistance?: number | null;
      heartRate?: number | null;
    }[];
    notes?: string;
  }) => Promise<boolean>;
```

Modify lines 23-27:
```typescript
interface SetInput {
  weight: string;
  reps: string;
  rpe: string;
  incline: string;
  resistance: string;
  heartRate: string;
}
```

- [ ] **Step 3: Commit frontend types**

Run:
```bash
git add frontend/src/App.tsx frontend/src/components/WorkoutLogger.tsx
git commit -m "feat(frontend): extend workout set types with optional cardio fields"
```

---

### Task 3: Dynamic Field Input UI and History List Update

**Files:**
- Modify: `frontend/src/components/WorkoutLogger.tsx`
- Modify: `frontend/src/components/AnalyticsCharts.tsx`

- [ ] **Step 1: Update WorkoutLogger state initialization and prepopulation**

In [frontend/src/components/WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx), update state initialization and `useEffect` logic for prepopulation / edit prepopulation.

Modify the initial state around line 39:
```typescript
  const [sets, setSets] = useState<SetInput[]>([{ weight: '', reps: '', rpe: '', incline: '', resistance: '', heartRate: '' }]);
```

Modify the prepopulation `useEffect` block around lines 52-75:
```typescript
  useEffect(() => {
    if (editLog) {
      setNotes(editLog.notes || '');
      if (editLog.sets && editLog.sets.length > 0) {
        setSets(editLog.sets.map(s => ({
          weight: s.weight.toString(),
          reps: s.reps.toString(),
          rpe: s.rpe ? s.rpe.toString() : '',
          incline: s.incline !== undefined && s.incline !== null ? s.incline.toString() : '',
          resistance: s.resistance !== undefined && s.resistance !== null ? s.resistance.toString() : '',
          heartRate: s.heartRate !== undefined && s.heartRate !== null ? s.heartRate.toString() : ''
        })));
      }
      setHasPrepopulated(true);
    } else if (!hasPrepopulated && historyLogs.length > 0) {
      const lastLog = historyLogs[0];
      if (lastLog.sets && lastLog.sets.length > 0) {
        const prepopulatedSets = lastLog.sets.map(s => ({
          weight: s.weight.toString(),
          reps: s.reps.toString(),
          rpe: s.rpe ? s.rpe.toString() : '',
          incline: s.incline !== undefined && s.incline !== null ? s.incline.toString() : '',
          resistance: s.resistance !== undefined && s.resistance !== null ? s.resistance.toString() : '',
          heartRate: s.heartRate !== undefined && s.heartRate !== null ? s.heartRate.toString() : ''
        }));
        setSets(prepopulatedSets);
        setHasPrepopulated(true);
      }
    }
  }, [historyLogs, hasPrepopulated, editLog]);
```

Modify `handleAddSetRow` around lines 77-87:
```typescript
  const handleAddSetRow = () => {
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        weight: lastSet ? lastSet.weight : '',
        reps: lastSet ? lastSet.reps : '',
        rpe: lastSet ? lastSet.rpe : '',
        incline: lastSet ? lastSet.incline : '',
        resistance: lastSet ? lastSet.resistance : '',
        heartRate: lastSet ? lastSet.heartRate : ''
      }
    ]);
  };
```

- [ ] **Step 2: Update WorkoutLogger equipment matching logic and submission parse**

In [frontend/src/components/WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx), define specific equipment identification helpers and map fields correctly on submission based on equipment.

Modify lines 44:
```typescript
  const isCardio = equipment.muscleGroup === 'CARDIO';
  const isTreadmill = isCardio && equipment.type.startsWith('T');
  const isResistanceCardio = isCardio && (equipment.type.startsWith('C') || equipment.type.startsWith('S') || equipment.type.startsWith('E'));
```

Modify the submission loop inside `handleSubmit` around lines 110-123:
```typescript
    const formattedSets = [];
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      if (!s.weight || !s.reps || isNaN(parseFloat(s.weight)) || isNaN(parseInt(s.reps))) {
        alert(isCardio ? `Please enter valid distance and time for Set ${i + 1}!` : `Please enter valid weight and reps for Set ${i + 1}!`);
        return;
      }
      formattedSets.push({
        setNumber: i + 1,
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        rpe: !isCardio && s.rpe ? (isNaN(parseInt(s.rpe)) ? null : parseInt(s.rpe)) : null,
        incline: isTreadmill && s.incline ? (isNaN(parseFloat(s.incline)) ? null : parseFloat(s.incline)) : null,
        resistance: isResistanceCardio && s.resistance ? (isNaN(parseInt(s.resistance)) ? null : parseInt(s.resistance)) : null,
        heartRate: isCardio && s.heartRate ? (isNaN(parseInt(s.heartRate)) ? null : parseInt(s.heartRate)) : null
      });
    }
```
And clear the form states inside `handleSubmit` success block:
```typescript
    if (success) {
      setSets([{ weight: '', reps: '', rpe: '', incline: '', resistance: '', heartRate: '' }]);
      setNotes('');
      onClose();
    }
```

- [ ] **Step 3: Render dynamic form layout**

In [frontend/src/components/WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx), update form grid headers and inputs to adjust width templates dynamically.

Modify headers around line 222:
```typescript
            <div style={{
              display: 'grid',
              gridTemplateColumns: isTreadmill || isResistanceCardio 
                ? '40px 1fr 1fr 80px 80px 40px' 
                : '40px 1fr 1fr 60px 40px',
              gap: '8px',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted-dark)',
              textAlign: 'center'
            }}>
              <div>Set</div>
              <div>{isCardio ? 'Distance' : 'Weight'}</div>
              <div>{isCardio ? 'Time' : 'Reps'}</div>
              {isTreadmill || isResistanceCardio ? (
                <>
                  <div>Heart Rate</div>
                  <div>{isTreadmill ? 'Incline' : 'Resistance'}</div>
                </>
              ) : (
                <div>RPE</div>
              )}
              <div></div>
            </div>
```

Modify input grid around line 231:
```typescript
            {sets.map((set, idx) => (
              <div
                key={`set-row-${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isTreadmill || isResistanceCardio 
                    ? '40px 1fr 1fr 80px 80px 40px' 
                    : '40px 1fr 1fr 60px 40px',
                  gap: '8px',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted-dark)' }}>{idx + 1}</div>
                <div>
                  <input
                    type="number"
                    step="any"
                    className="equipment-search"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                    placeholder={isCardio ? "km" : "kg/lbs"}
                    value={set.weight}
                    onChange={(e) => handleInputChange(idx, 'weight', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    className="equipment-search"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                    placeholder={isCardio ? "mins" : "reps"}
                    value={set.reps}
                    onChange={(e) => handleInputChange(idx, 'reps', e.target.value)}
                    required
                  />
                </div>
                {isTreadmill || isResistanceCardio ? (
                  <>
                    <div>
                      <input
                        type="number"
                        className="equipment-search"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                        placeholder="BPM"
                        value={set.heartRate || ''}
                        onChange={(e) => handleInputChange(idx, 'heartRate', e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        className="equipment-search"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                        placeholder={isTreadmill ? "%" : "Lvl"}
                        value={isTreadmill ? set.incline : set.resistance}
                        onChange={(e) => handleInputChange(idx, isTreadmill ? 'incline' : 'resistance', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="equipment-search"
                      style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                      placeholder="1-10"
                      value={set.rpe}
                      onChange={(e) => handleInputChange(idx, 'rpe', e.target.value)}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {sets.length > 1 && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
                      onClick={() => handleRemoveSetRow(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
```

- [ ] **Step 4: Update WorkoutLogger history render**

In [frontend/src/components/WorkoutLogger.tsx](file:///opt/gym-tracker/frontend/src/components/WorkoutLogger.tsx), update the history log sets display block to render detailed cardio metrics.

Modify the sets rendering inside history logs around lines 380-396:
```typescript
                      {/* Sets Detail */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: log.notes ? '6px' : '0' }}>
                        {log.sets.map((s) => {
                          let extraDetails = '';
                          if (isCardio) {
                            const hr = s.heartRate;
                            const inc = s.incline;
                            const res = s.resistance;
                            
                            if (hr && inc !== null && inc !== undefined && isTreadmill) {
                              extraDetails = ` (心率: ${hr} BPM, 坡度: ${inc}%)`;
                            } else if (hr && res !== null && res !== undefined && isResistanceCardio) {
                              extraDetails = ` (心率: ${hr} BPM, 阻力: Lvl ${res})`;
                            } else if (hr) {
                              extraDetails = ` (心率: ${hr} BPM)`;
                            }
                          } else if (s.rpe) {
                            extraDetails = ` (RPE ${s.rpe})`;
                          }
                          
                          return (
                            <div key={s.id || s.setNumber} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--gold-dark)' }}>Set {s.setNumber}:</span>
                              {isCardio ? (
                                <span>{s.weight} km × {s.reps} mins</span>
                              ) : (
                                <span>{s.weight} × {s.reps} reps</span>
                              )}
                              {extraDetails && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', fontStyle: 'italic' }}>
                                  {extraDetails}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
```

- [ ] **Step 5: Update AnalyticsCharts history render**

In [frontend/src/components/AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx), modify the log sets display inside the main history logs list (around lines 724-730) to show cardio metrics.

Modify:
```typescript
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {log.sets.map((s) => {
                              let extraInfo = '';
                              const logCardio = log.equipment?.muscleGroup === 'CARDIO';
                              const logTreadmill = logCardio && log.equipment?.type?.startsWith('T');
                              const logResistanceCardio = logCardio && (log.equipment?.type?.startsWith('C') || log.equipment?.type?.startsWith('S') || log.equipment?.type?.startsWith('E'));
                              
                              if (logCardio) {
                                if (s.heartRate && s.incline !== null && s.incline !== undefined && logTreadmill) {
                                  extraInfo = ` (${s.heartRate}BPM, ${s.incline}%)`;
                                } else if (s.heartRate && s.resistance !== null && s.resistance !== undefined && logResistanceCardio) {
                                  extraInfo = ` (${s.heartRate}BPM, L${s.resistance})`;
                                } else if (s.heartRate) {
                                  extraInfo = ` (${s.heartRate}BPM)`;
                                }
                              } else if (s.rpe) {
                                extraInfo = ` (R${s.rpe})`;
                              }
                              return (
                                <span key={s.id || s.setNumber} style={{ fontSize: '11px', color: 'var(--text-dark)', backgroundColor: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: '4px' }}>
                                  #{s.setNumber}: {logCardio ? `${s.weight}km` : `${s.weight}kg`} × {logCardio ? `${s.reps}m` : `${s.reps}r`}{extraInfo}
                                </span>
                              );
                            })}
                          </div>
                        </td>
```

- [ ] **Step 6: Verify frontend compilation**

Run: `npm run build` in the `/opt/gym-tracker/frontend` directory.
Expected: Compilation completes successfully.

- [ ] **Step 7: Commit UI changes**

Run:
```bash
git add frontend/src/components/WorkoutLogger.tsx frontend/src/components/AnalyticsCharts.tsx
git commit -m "feat(frontend): implement dynamic cardio inputs and history list display"
```

---

### Task 4: Rebuild Containers and Verification

**Files:**
- None (deployment and testing)

- [ ] **Step 1: Rebuild and restart services via Docker Compose**

Run: `docker compose up -d --build` in the `/opt/gym-tracker` directory.
Expected: Containers are successfully rebuilt and restarted.

- [ ] **Step 2: Verify database columns schema**

Query the PostgreSQL database using Prisma Client or a simple script to verify columns exist.
Expected: `incline`, `resistance`, and `heartRate` columns are created in PostgreSQL `WorkoutSet` table.

- [ ] **Step 3: End-to-end verification**

1. Open the gym-tracker app and select a Treadmill (`T` prefix).
2. Log a workout set with distance, time, heart rate, and incline.
3. Save the log and verify it displays correctly in both the workout logger history and the analytics charts logs table.
4. Select a Cycle (`C` prefix) or Elliptical (`E` prefix).
5. Log a workout set with distance, time, heart rate, and resistance.
6. Verify it displays correctly.

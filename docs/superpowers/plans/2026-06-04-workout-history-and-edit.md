# Gymformer Workout History Table & Log Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a centralized Workout History Log table in the Analytics page with search and filter inputs. Support editing logs by opening the WorkoutLogger modal in Edit Mode, backed by a new PUT API in the server.

**Architecture:** Create `PUT /api/logs/:id` route in backend. Add edit states and update handlers in App.tsx. Enable Edit Mode in WorkoutLogger.tsx. Render the responsive history table with filters in AnalyticsCharts.tsx.

**Tech Stack:** Express, Prisma, PostgreSQL, React, TypeScript, Lucide Icons.

---

### Task 1: Add PUT /api/logs/:id Route in Backend

**Files:**
- Modify: `backend/src/server.ts:170-172`
- Test: Compile check in backend

- [ ] **Step 1: Write the PUT log handler in server.ts**

Locate line 170 in `/opt/gym-tracker/backend/src/server.ts` (just before the delete log endpoint) and add the `app.put` handler with a transaction to safely update log notes and recreate sets:
```typescript
// 4.5 PUT /api/logs/:id - 更新訓練紀錄與組數
app.put('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sets, notes } = req.body;

    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      return res.status(400).json({ error: 'Invalid workout log data' });
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      // Delete existing sets
      await tx.workoutSet.deleteMany({
        where: { logId: id }
      });

      // Update notes and recreate sets
      return await tx.workoutLog.update({
        where: { id },
        data: {
          notes,
          sets: {
            create: sets.map((s: any, idx: number) => ({
              setNumber: s.setNumber || (idx + 1),
              weight: parseFloat(s.weight),
              reps: parseInt(s.reps),
              rpe: s.rpe ? parseInt(s.rpe) : null
            }))
          }
        },
        include: {
          equipment: true,
          sets: true
        }
      });
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ error: 'Failed to update workout log' });
  }
});
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build` inside `backend/`
Expected: Compile success

---

### Task 2: Implement Update States and Callbacks in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: Build compilation check

- [ ] **Step 1: Add editingLog state in App.tsx**

Add the state inside the `App` component (around line 46):
```typescript
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
```

- [ ] **Step 2: Add handleUpdateLog API method in App.tsx**

Add the function (around line 125, next to `handleAddLog`):
```typescript
  // Update existing workout log
  const handleUpdateLog = async (logId: string, logData: {
    sets: { setNumber: number; weight: number; reps: number; rpe?: number | null }[];
    notes?: string;
  }) => {
    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkoutLogs((prev) => prev.map((log) => log.id === logId ? updated : log));
        fetchData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating log:', err);
      return false;
    }
  };
```

- [ ] **Step 3: Modify modal rendering block in App.tsx**

Update the `selectedEquipment` modal block to support the `editingLog` condition (around line 220):
```typescript
      {/* Workout Logger Modal */}
      {(selectedEquipment || editingLog) && (
        <WorkoutLogger
          equipment={selectedEquipment || editingLog!.equipment}
          historyLogs={workoutLogs.filter(log => log.equipmentId === (selectedEquipment ? selectedEquipment.id : editingLog!.equipmentId))}
          editLog={editingLog || undefined}
          onClose={() => {
            setSelectedEquipment(null);
            setEditingLog(null);
          }}
          onAddLog={handleAddLog}
          onUpdateLog={handleUpdateLog}
          onDeleteLog={handleDeleteLog}
```

- [ ] **Step 4: Update AnalyticsCharts prop mapping**

Pass deletion and edit handlers to `AnalyticsCharts` (around line 212):
```typescript
          ) : (
            <AnalyticsCharts 
              logs={workoutLogs} 
              onDeleteLog={handleDeleteLog}
              onEditLog={(log) => setEditingLog(log)}
            />
          )}
```

- [ ] **Step 5: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile error due to `onDeleteLog`, `onEditLog` not existing in `AnalyticsChartsProps`, and `editLog`, `onUpdateLog` not in `WorkoutLoggerProps`.

---

### Task 3: Support Edit Mode in WorkoutLogger.tsx

**Files:**
- Modify: `frontend/src/components/WorkoutLogger.tsx`
- Test: Build compilation check

- [ ] **Step 1: Update WorkoutLoggerProps interface**

Expose `editLog` and `onUpdateLog` to the component props (around line 5):
```typescript
interface WorkoutLoggerProps {
  equipment: PlacedEquipment;
  historyLogs: WorkoutLog[];
  editLog?: WorkoutLog;
  onClose: () => void;
  onAddLog: (logData: {
    equipmentId: string;
    sets: { setNumber: number; weight: number; reps: number; rpe?: number | null }[];
    notes?: string;
  }) => Promise<boolean>;
  onUpdateLog?: (logId: string, logData: {
    sets: { setNumber: number; weight: number; reps: number; rpe?: number | null }[];
    notes?: string;
  }) => Promise<boolean>;
  onDeleteLog: (logId: string) => Promise<boolean>;
  onChangeMuscleGroup?: (newMuscleGroup: string) => void;
}
```

- [ ] **Step 2: Add props destructuring & initialize edit values**

Update destructuring (around line 25) and update the pre-population logic to load `editLog` sets if editing (around line 38):
```typescript
const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  equipment,
  historyLogs,
  editLog,
  onClose,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onChangeMuscleGroup
}) => {
  const isCardio = equipment.muscleGroup === 'CARDIO';
  const [sets, setSets] = useState<SetInput[]>([{ weight: '', reps: '', rpe: '' }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [hasPrepopulated, setHasPrepopulated] = useState(false);

  // Prepopulate from previous log on startup OR load edit values
  useEffect(() => {
    if (editLog) {
      setNotes(editLog.notes || '');
      if (editLog.sets && editLog.sets.length > 0) {
        setSets(editLog.sets.map(s => ({
          weight: s.weight.toString(),
          reps: s.reps.toString(),
          rpe: s.rpe ? s.rpe.toString() : ''
        })));
      }
      setHasPrepopulated(true);
    } else if (!hasPrepopulated && historyLogs.length > 0) {
      const lastLog = historyLogs[0];
      if (lastLog.sets && lastLog.sets.length > 0) {
        const prepopulatedSets = lastLog.sets.map(s => ({
          weight: s.weight.toString(),
          reps: s.reps.toString(),
          rpe: s.rpe ? s.rpe.toString() : ''
        }));
        setSets(prepopulatedSets);
        setHasPrepopulated(true);
      }
    }
  }, [historyLogs, hasPrepopulated, editLog]);
```

- [ ] **Step 3: Modify handleSubmit for Update API**

Locate `handleSubmit` (around line 78) and routing log creation/update calls dynamically:
```typescript
    setIsSubmitting(true);
    let success = false;
    if (editLog && onUpdateLog) {
      success = await onUpdateLog(editLog.id, {
        sets: formattedSets,
        notes: notes.trim()
      });
    } else {
      success = await onAddLog({
        equipmentId: equipment.id,
        sets: formattedSets,
        notes: notes.trim()
      });
    }

    setIsSubmitting(false);
    if (success) {
      setSets([{ weight: '', reps: '', rpe: '' }]);
      setNotes('');
      onClose();
    } else {
      alert('Failed to save log. Please check your connection.');
    }
```

- [ ] **Step 4: Update UI elements for Edit Mode**

- Title header (around line 130):
  ```typescript
  <h3 className="modal-title">
    {editLog ? '修改訓練紀錄' : 'LOG WORKOUT'} - {equipment.customName}
  </h3>
  ```
- Save Button label (around line 273):
  ```typescript
              <button className="btn-gold" type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
                {isSubmitting ? 'Saving...' : editLog ? '儲存修改 (Update Log)' : '記錄訓練 (Save Log)'}
              </button>
  ```

- [ ] **Step 5: Verify compilation**

Run: `npm run build` inside `frontend/`
Expected: Compile error due to missing props in `AnalyticsCharts`.

---

### Task 4: Build Workout History Table in AnalyticsCharts.tsx

**Files:**
- Modify: `frontend/src/components/AnalyticsCharts.tsx`
- Test: Build compilation check

- [ ] **Step 1: Update AnalyticsChartsProps interface**

Expose callback functions `onDeleteLog` and `onEditLog` (around line 6):
```typescript
interface AnalyticsChartsProps {
  logs: WorkoutLog[];
  onDeleteLog?: (logId: string) => Promise<boolean>;
  onEditLog?: (log: WorkoutLog) => void;
}
```

- [ ] **Step 2: Add Search, Filter state and Lucide icons**

Add states for history search inside the component (around line 34):
```typescript
const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ logs, onDeleteLog, onEditLog }) => {
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ANY');
  const [historySearch, setHistorySearch] = useState('');
  const [historyMuscleFilter, setHistoryMuscleFilter] = useState('ALL');
```
Import `Edit2` and `Trash2` inside imports at the top (line 3):
```typescript
import { Award, TrendingUp, Calendar, ArrowRight, ShieldAlert, Activity, Edit2, Trash2 } from 'lucide-react';
```

- [ ] **Step 3: Add Filter logic for History table logs**

Create a `useMemo` calculation to filter logs for the history table (around line 145):
```typescript
  // Filter logs for the history logs table
  const filteredHistoryLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = (log.equipment?.customName || '').toLowerCase().includes(historySearch.toLowerCase());
      const matchesMuscle = historyMuscleFilter === 'ALL' || (log.equipment?.muscleGroup || 'ANY') === historyMuscleFilter;
      return matchesSearch && matchesMuscle;
    });
  }, [logs, historySearch, historyMuscleFilter]);
```

- [ ] **Step 4: Render the Workout History Table card**

Locate the end of the `left panel` section wrapper (just before the `</section>` around line 475) and insert the new history card containing filters and the table:
```typescript
          )}
        </div>

        {/* Global Workout History Table */}
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ color: 'var(--gold-primary)' }} size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>訓練歷史日誌 (Workout History)</h3>
            </div>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="equipment-search"
                style={{ width: '160px', padding: '5px 10px', fontSize: '12px', backgroundColor: '#fff', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                placeholder="搜尋器材名稱..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <select
                className="equipment-search"
                style={{ width: '130px', padding: '5px 10px', fontSize: '12px', backgroundColor: '#fff', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={historyMuscleFilter}
                onChange={(e) => setHistoryMuscleFilter(e.target.value)}
              >
                <option value="ALL">全部肌群</option>
                {Object.entries(MUSCLE_DETAILS).map(([key, details]) => (
                  <option key={key} value={key}>{details.label.split(' ')[0]}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredHistoryLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted-dark)', textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
              沒有符合的訓練日誌紀錄。
            </p>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '320px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(204, 163, 83, 0.05)', borderBottom: '1px solid var(--border-gold)', color: 'var(--text-dark)', fontWeight: 600 }}>
                    <th style={{ padding: '10px 12px' }}>日期</th>
                    <th style={{ padding: '10px 12px' }}>器材名稱</th>
                    <th style={{ padding: '10px 12px' }}>部位</th>
                    <th style={{ padding: '10px 12px' }}>訓練細節</th>
                    <th style={{ padding: '10px 12px' }}>備忘</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>動作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryLogs.map((log) => {
                    const d = new Date(log.loggedAt);
                    const formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const isCardio = log.equipment?.muscleGroup === 'CARDIO';

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-dark)' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted-dark)' }}>{formattedDate}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.equipment?.customName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', backgroundColor: 'rgba(204,163,83,0.1)', color: 'var(--gold-dark)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                            {MUSCLE_DETAILS[log.equipment?.muscleGroup || 'ANY']?.label.split(' ')[0]}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {log.sets.map((s) => (
                              <span key={s.id || s.setNumber} style={{ fontSize: '11px', color: 'var(--text-dark)', backgroundColor: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: '4px' }}>
                                #{s.setNumber}: {isCardio ? `${s.weight}km` : `${s.weight}kg`} × {isCardio ? `${s.reps}m` : `${s.reps}r`}{s.rpe ? `(${isCardio ? `L${s.rpe}` : `R${s.rpe}`})` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted-dark)', fontStyle: 'italic', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes || ''}>
                          {log.notes || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '10px' }}>
                            {onEditLog && (
                              <button
                                onClick={() => onEditLog(log)}
                                style={{ background: 'none', border: 'none', color: 'var(--gold-dark)', cursor: 'pointer', padding: 0 }}
                                title="編輯紀錄"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {onDeleteLog && (
                              <button
                                onClick={() => {
                                  if (confirm('確定要刪除這筆訓練紀錄嗎？此動作無法復原。')) {
                                    onDeleteLog(log.id);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}
                                title="刪除紀錄"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
```

- [ ] **Step 5: Verify compilation**

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

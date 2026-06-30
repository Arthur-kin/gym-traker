import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, MessageSquare } from 'lucide-react';
import { PlacedEquipment, WorkoutLog, WorkoutSet } from '../App';
import { useToast } from './Toast';

interface WorkoutLoggerProps {
  equipment: PlacedEquipment;
  historyLogs: WorkoutLog[];
  editLog?: WorkoutLog;
  onClose: () => void;
  onAddLog: (logData: {
    equipmentId: string;
    sets: Omit<WorkoutSet, 'id'>[];
    notes?: string;
  }) => Promise<boolean>;
  onUpdateLog?: (logId: string, logData: {
    sets: Omit<WorkoutSet, 'id'>[];
    notes?: string;
  }) => Promise<boolean>;
  onDeleteLog: (logId: string) => Promise<boolean>;
  onChangeMuscleGroup?: (newMuscleGroup: string) => void;
}

interface SetInput {
  weight: string;
  reps: string;
  rpe: string;
  incline: string;
  resistance: string;
  heartRate: string;
}

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
  const { showToast } = useToast();
  const [sets, setSets] = useState<SetInput[]>([{ weight: '', reps: '', rpe: '', incline: '', resistance: '', heartRate: '' }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [hasPrepopulated, setHasPrepopulated] = useState(false);
  const isCardio = equipment.muscleGroup === 'CARDIO';
  const isTreadmill = isCardio && equipment.type.startsWith('T');
  const isCycleStepperElliptical = isCardio && (equipment.type.startsWith('C') || equipment.type.startsWith('S') || equipment.type.startsWith('E'));
  const gridCols = (isTreadmill || isCycleStepperElliptical)
    ? '40px 1fr 1fr 80px 80px 40px'
    : '40px 1fr 1fr 60px 40px';

  // Reset pre-population lock when equipment changes
  useEffect(() => {
    setHasPrepopulated(false);
  }, [equipment.id, editLog]);

  // Prepopulate from previous log on startup to save user typing time OR load edit values
  useEffect(() => {
    if (editLog) {
      setNotes(editLog.notes || '');
      if (editLog.sets && editLog.sets.length > 0) {
        setSets(editLog.sets.map(s => ({
          weight: s.weight.toString(),
          reps: s.reps.toString(),
          rpe: s.rpe !== undefined && s.rpe !== null ? s.rpe.toString() : '',
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
          rpe: s.rpe !== undefined && s.rpe !== null ? s.rpe.toString() : '',
          incline: s.incline !== undefined && s.incline !== null ? s.incline.toString() : '',
          resistance: s.resistance !== undefined && s.resistance !== null ? s.resistance.toString() : '',
          heartRate: s.heartRate !== undefined && s.heartRate !== null ? s.heartRate.toString() : ''
        }));
        setSets(prepopulatedSets);
        setHasPrepopulated(true);
      }
    }
  }, [historyLogs, hasPrepopulated, editLog]);

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

  const handleRemoveSetRow = (index: number) => {
    if (sets.length === 1) return;
    setSets(sets.filter((_, idx) => idx !== index));
  };

  const handleInputChange = (index: number, field: keyof SetInput, value: string) => {
    const updatedSets = [...sets];
    updatedSets[index] = {
      ...updatedSets[index],
      [field]: value
    };
    setSets(updatedSets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment.id) {
      showToast('Please save the gym layout first before recording logs!', 'error');
      return;
    }

    const formattedSets = [];
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      if (!s.weight || !s.reps || isNaN(parseFloat(s.weight)) || isNaN(parseInt(s.reps))) {
        showToast(isCardio ? `Please enter valid distance and time for Set ${i + 1}!` : `Please enter valid weight and reps for Set ${i + 1}!`, 'error');
        return;
      }

      const parseNumber = (val: string, parser: (v: string) => number) => {
        if (val === undefined || val === null || val.trim() === '') return null;
        const parsed = parser(val);
        return isNaN(parsed) ? null : parsed;
      };

      formattedSets.push({
        setNumber: i + 1,
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps, 10),
        rpe: (!isTreadmill && !isCycleStepperElliptical) ? parseNumber(s.rpe, (v) => parseInt(v, 10)) : null,
        incline: isTreadmill ? parseNumber(s.incline, parseFloat) : null,
        resistance: isCycleStepperElliptical ? parseNumber(s.resistance, (v) => parseInt(v, 10)) : null,
        heartRate: (isTreadmill || isCycleStepperElliptical) ? parseNumber(s.heartRate, (v) => parseInt(v, 10)) : null
      });
    }

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
      setSets([{ weight: '', reps: '', rpe: '', incline: '', resistance: '', heartRate: '' }]);
      setNotes('');
      onClose();
    } else {
      showToast('Failed to save log. Please check your connection.', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{editLog ? 'Edit Workout Log' : 'LOG WORKOUT'} - {equipment.customName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Target Muscle:
              </span>
              <select
                value={equipment.muscleGroup}
                onChange={(e) => {
                  if (onChangeMuscleGroup) {
                    onChangeMuscleGroup(e.target.value);
                  }
                }}
                style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--bg-panel-light)',
                  color: 'var(--gold-primary)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {[
                  { value: 'ANY', label: 'Any / Compound (複合肌群)' },
                  { value: 'CHEST_UPPER', label: 'Upper Chest (上胸)' },
                  { value: 'CHEST_LOWER', label: 'Lower Chest (中下胸)' },
                  { value: 'BACK_LAT', label: 'Lats (背闊肌)' },
                  { value: 'BACK_UPPER', label: 'Upper Back (上背斜方)' },
                  { value: 'BACK_LOWER', label: 'Lower Back (豎脊肌)' },
                  { value: 'SHOULDERS_FRONT', label: 'Front Delt (前三角)' },
                  { value: 'SHOULDERS_LAT', label: 'Lateral Delt (側三角)' },
                  { value: 'SHOULDERS_REAR', label: 'Rear Delt (後三角)' },
                  { value: 'ARMS_BICEPS', label: 'Biceps (二頭肌)' },
                  { value: 'ARMS_TRICEPS', label: 'Triceps (三頭肌)' },
                  { value: 'ARMS_FOREARM', label: 'Forearms (前臂)' },
                  { value: 'LEGS_QUADS', label: 'Quads (股四頭)' },
                  { value: 'LEGS_HAMSTRINGS', label: 'Hamstrings (後腿)' },
                  { value: 'LEGS_GLUTES', label: 'Glutes (臀肌)' },
                  { value: 'LEGS_CALVES', label: 'Calves (小腿)' },
                  { value: 'CORE_ABS', label: 'Abs (腹直肌)' },
                  { value: 'CORE_OBLIQUE', label: 'Obliques (側腹)' },
                  { value: 'CARDIO', label: 'Cardio (心肺)' }
                ].map(item => (
                  <option key={item.value} value={item.value} style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-light)' }}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ overflowX: 'auto', width: '100%', marginBottom: '16px' }}>
              <div style={{ minWidth: '400px' }}>
                {/* Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', textAlign: 'center' }}>
                  <div>Set</div>
                  <div>{isCardio ? 'Distance' : 'Weight'}</div>
                  <div>{isCardio ? 'Time' : 'Reps'}</div>
                  {isTreadmill && (
                    <>
                      <div>HR (BPM)</div>
                      <div>Incline</div>
                    </>
                  )}
                  {isCycleStepperElliptical && (
                    <>
                      <div>HR (BPM)</div>
                      <div>Resistance</div>
                    </>
                  )}
                  {!isTreadmill && !isCycleStepperElliptical && (
                    <div>RPE</div>
                  )}
                  <div></div>
                </div>

                {/* Set Inputs */}
                {sets.map((set, idx) => (
                  <div
                    key={`set-row-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridCols,
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
                        min="0"
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
                        min="0"
                        className="equipment-search"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                        placeholder={isCardio ? "mins" : "reps"}
                        value={set.reps}
                        onChange={(e) => handleInputChange(idx, 'reps', e.target.value)}
                        required
                      />
                    </div>
                    {isTreadmill && (
                      <>
                        <div>
                          <input
                            type="number"
                            min="0"
                            className="equipment-search"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                            placeholder="BPM"
                            value={set.heartRate}
                            onChange={(e) => handleInputChange(idx, 'heartRate', e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="equipment-search"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                            placeholder="%"
                            value={set.incline}
                            onChange={(e) => handleInputChange(idx, 'incline', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    {isCycleStepperElliptical && (
                      <>
                        <div>
                          <input
                            type="number"
                            min="0"
                            className="equipment-search"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                            placeholder="BPM"
                            value={set.heartRate}
                            onChange={(e) => handleInputChange(idx, 'heartRate', e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="equipment-search"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', textAlign: 'center', padding: '8px' }}
                            placeholder="Lvl"
                            value={set.resistance}
                            onChange={(e) => handleInputChange(idx, 'resistance', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    {!isTreadmill && !isCycleStepperElliptical && (
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
              </div>
            </div>

            {/* Add Set Button */}
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', padding: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--gold-primary)', color: 'var(--gold-dark)', marginBottom: '16px' }}
              onClick={handleAddSetRow}
            >
              <Plus size={16} />
              Add Set
            </button>

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '6px' }}>
                Workout Notes
              </label>
              <textarea
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', minHeight: '60px', resize: 'vertical' }}
                placeholder="How did it feel? (e.g. felt strong, hit failure, good form...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-gold"
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editLog ? 'Update Log' : 'Save Log'}
            </button>
          </form>

          {/* History list */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-gold)', paddingTop: '20px' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}
              onClick={() => setShowHistory(!showHistory)}
            >
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)' }}>
                History ({historyLogs.length})
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--gold-dark)' }}>
                {showHistory ? 'Hide ▲' : 'Show ▼'}
              </span>
            </div>

            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {historyLogs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted-dark)', textAlign: 'center', padding: '16px' }}>
                    No workout history for this equipment yet. Start your first session today!
                  </p>
                ) : (
                  historyLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        border: '1px solid rgba(203, 161, 84, 0.15)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px',
                        position: 'relative'
                      }}
                    >
                      {/* Delete History Log */}
                      <button
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer' }}
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this workout log? This cannot be undone.')) {
                            onDeleteLog(log.id);
                          }
                        }}
                        title="Delete log"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted-dark)', marginBottom: '8px', fontWeight: 500 }}>
                        <Calendar size={13} />
                        {formatDate(log.loggedAt)}
                      </div>

                      {/* Sets Detail */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: log.notes ? '6px' : '0' }}>
                        {log.sets.map((s) => (
                          <div key={s.id || s.setNumber} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--gold-dark)' }}>Set {s.setNumber}:</span>
                            {isCardio ? (
                              <span>
                                {s.weight} km × {s.reps} mins
                                {(() => {
                                  const details = [];
                                  if (s.heartRate !== null && s.heartRate !== undefined) details.push(`HR: ${s.heartRate} BPM`);
                                  if (s.incline !== null && s.incline !== undefined) details.push(`Incline: ${s.incline}%`);
                                  if (s.resistance !== null && s.resistance !== undefined) details.push(`Resistance: Lvl ${s.resistance}`);
                                  return details.length > 0 ? ` (${details.join(', ')})` : '';
                                })()}
                              </span>
                            ) : (
                              <>
                                <span>{s.weight} × {s.reps} reps</span>
                                {s.rpe && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', fontStyle: 'italic' }}>
                                    (RPE {s.rpe})
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <div style={{ display: 'flex', gap: '6px', color: 'var(--text-muted-dark)', fontStyle: 'italic', fontSize: '12px', marginTop: '6px', borderTop: '1px dotted rgba(0, 0, 0, 0.05)', paddingTop: '4px' }}>
                          <MessageSquare size={12} style={{ marginTop: '2px' }} />
                          <span>{log.notes}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutLogger;

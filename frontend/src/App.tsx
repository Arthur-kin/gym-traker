import { useState, useEffect } from 'react';
import { Layout, BarChart2, Dumbbell, Save, RefreshCw, Award } from 'lucide-react';
import GymCanvas from './components/GymCanvas';
import WorkoutLogger from './components/WorkoutLogger';
import AnalyticsCharts from './components/AnalyticsCharts';
import ProfileModal, { UserProfileData } from './components/ProfileModal';
import CoachDashboard from './components/CoachDashboard';
import { useToast } from './components/Toast';

export interface PlacedEquipment {
  id?: string;
  type: string;
  customName: string;
  muscleGroup: string;
  gridX: number;
  gridY: number;
  rotation: number;
}

export interface GymLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  equipment: PlacedEquipment[];
}

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

export interface WorkoutLog {
  id: string;
  equipmentId: string;
  loggedAt: string;
  notes?: string | null;
  equipment: PlacedEquipment;
  sets: WorkoutSet[];
}

function App() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'layout' | 'analytics' | 'coach'>('layout');
  const [layout, setLayout] = useState<GymLayout | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<PlacedEquipment | null>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sequential logging queue state for PPL workout routine
  const [logQueue, setLogQueue] = useState<{ equipmentId: string; sets: number }[]>([]);

  const [theme, setTheme] = useState<'gold-gray' | 'dark-purple'>(() => {
    return (localStorage.getItem('gym-theme') as 'gold-gray' | 'dark-purple') || 'gold-gray';
  });

  const gradientStops = theme === 'dark-purple'
    ? { start: '#c084fc', mid: '#a855f7', end: '#7e22ce' }
    : { start: '#dfbf7c', mid: '#cca353', end: '#a67f37' };

  // Starts sequential logging for a selected PPL workout routine day
  const handleStartWorkoutSession = (exercises: { equipmentId: string | null; sets: number }[]) => {
    if (!exercises || exercises.length === 0) return;
    const queue = exercises
      .filter((ex) => !!ex.equipmentId)
      .map((ex) => ({ equipmentId: ex.equipmentId!, sets: ex.sets }));

    if (queue.length === 0) {
      showToast('No matching placed equipment found for this routine! Place them first.', 'error');
      return;
    }

    const firstItem = queue[0];
    const firstEquip = layout?.equipment.find((eq) => eq.id === firstItem.equipmentId);
    if (firstEquip) {
      setLogQueue(queue.slice(1));
      setSelectedEquipment(firstEquip);
      showToast(`Starting routine workout! Let's log the first exercise: ${firstEquip.customName}`, 'info');
    }
  };

  // Fetch initial layout, logs, and profile from server (Non-blocking logs load)
  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch layout and profile (critical for initial layout view)
    try {
      const [layoutRes, profileRes] = await Promise.all([
        fetch('/api/layout'),
        fetch('/api/profile')
      ]);
      
      if (layoutRes.ok) {
        const layoutData = await layoutRes.json();
        setLayout(layoutData);
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUserProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching layout/profile data:', err);
    } finally {
      setIsLoading(false); // Instantly unlock UI!
    }

    // Fetch logs concurrently in the background (non-blocking)
    try {
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setWorkoutLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching logs asynchronously:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save current gym layout to database
  const handleSaveLayout = async () => {
    if (!layout) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout)
      });
      if (res.ok) {
        const updatedLayout = await res.json();
        setLayout(updatedLayout);
        showToast('Gym layout saved successfully!', 'success');
      } else {
        showToast('Failed to save layout. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      showToast('An error occurred while saving the layout.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new workout log
  const handleAddLog = async (logData: {
    equipmentId: string;
    sets: Omit<WorkoutSet, 'id'>[];
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (res.ok) {
        const newLog = await res.json();
        setWorkoutLogs((prev) => [newLog, ...prev]);
        showToast('Workout log saved successfully!', 'success');

        // Check if there is another exercise in queue
        if (logQueue.length > 0) {
          const nextItem = logQueue[0];
          const nextEquip = layout?.equipment.find((eq) => eq.id === nextItem.equipmentId);
          if (nextEquip) {
            setLogQueue((prev) => prev.slice(1));
            setTimeout(() => {
              setSelectedEquipment(nextEquip);
              setEditingLog(null);
              showToast(`Next exercise: ${nextEquip.customName}`, 'info');
            }, 400);
          }
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding log:', err);
      return false;
    }
  };

  // Update existing workout log
  const handleUpdateLog = async (logId: string, logData: {
    sets: Omit<WorkoutSet, 'id'>[];
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
        showToast('Workout log updated successfully!', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating log:', err);
      return false;
    }
  };

  // Delete workout log
  const handleDeleteLog = async (logId: string) => {
    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setWorkoutLogs((prev) => prev.filter((log) => log.id !== logId));
        showToast('Workout log deleted successfully!', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting log:', err);
      return false;
    }
  };

  const handleSaveProfile = async (profileData: UserProfileData) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(updated);
        showToast('Profile saved successfully!', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save profile:', err);
      return false;
    }
  };

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Reusable SVG Gold Gradient Defs */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStops.start} />
            <stop offset="50%" stopColor={gradientStops.mid} />
            <stop offset="100%" stopColor={gradientStops.end} />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Navbar Header */}
      <header className="app-header">
        <a href="#" className="brand">
          <Dumbbell className="brand-logo" size={28} style={{ stroke: 'url(#gold-gradient)' }} />
          <h1 className="brand-text">Gymformer <span>// Layout & Track</span></h1>
        </a>

        <div className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveTab('layout')}
          >
            <Layout size={18} />
            Gym Floor Layout
          </button>
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={18} />
            Workout Analytics
          </button>
          <button
            className={`nav-item ${activeTab === 'coach' ? 'active' : ''}`}
            onClick={() => setActiveTab('coach')}
          >
            <Award size={18} />
            AI Coach
          </button>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowProfileModal(true)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: theme === 'dark-purple' ? 'var(--bg-panel-light)' : 'rgba(204, 163, 83, 0.1)',
              color: 'var(--gold-light)',
              border: '1px solid var(--border-gold)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Edit Profile"
          >
            <span>Profile</span>
          </button>

          <select
            value={theme}
            onChange={(e) => {
              const newTheme = e.target.value as 'gold-gray' | 'dark-purple';
              setTheme(newTheme);
              localStorage.setItem('gym-theme', newTheme);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: theme === 'dark-purple' ? 'var(--bg-panel-light)' : 'rgba(204, 163, 83, 0.1)',
              color: 'var(--gold-light)',
              border: '1px solid var(--border-gold)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              outline: 'none'
            }}
          >
            <option value="gold-gray" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-light)' }}>Gold & Gray</option>
            <option value="dark-purple" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-light)' }}>Black & Purple</option>
          </select>

          {activeTab === 'layout' && (
            <button
              className="btn-gold"
              onClick={handleSaveLayout}
              disabled={isSaving}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Save Layout
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', color: 'var(--text-dark)' }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--gold-primary)', marginBottom: '12px' }} />
            <p style={{ fontWeight: 500 }}>Loading gym layout and logs...</p>
          </div>
        </div>
      ) : (
        <main className={`dashboard-main tab-${activeTab}`}>
          {activeTab === 'layout' ? (
            <GymCanvas
              layout={layout || { id: 'default', name: 'My Home Gym', width: 8, height: 6, equipment: [] }}
              logs={workoutLogs}
              onChangeLayout={setLayout}
              onSelectEquipment={setSelectedEquipment}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsCharts 
              logs={workoutLogs} 
              onDeleteLog={handleDeleteLog}
              onEditLog={(log) => setEditingLog(log)}
            />
          ) : (
            <CoachDashboard
              layout={layout}
              onStartSession={handleStartWorkoutSession}
            />
          )}
        </main>
      )}

      {/* Workout Logger Modal */}
      {(() => {
        const targetEquipment = selectedEquipment || editingLog?.equipment;
        if (!targetEquipment) return null;
        return (
          <WorkoutLogger
            equipment={targetEquipment}
            historyLogs={workoutLogs.filter(log => log.equipmentId === targetEquipment.id)}
            editLog={editingLog || undefined}
            onClose={() => {
              setSelectedEquipment(null);
              setEditingLog(null);
              setLogQueue([]); // Clear session queue on manual cancel
            }}
            onAddLog={handleAddLog}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onChangeMuscleGroup={async (newMuscleGroup) => {
              if (!layout) return;
              
              const updatedEquipment = layout.equipment.map(eq => {
                const isMatch = eq.id && targetEquipment.id 
                  ? eq.id === targetEquipment.id 
                  : eq.gridX === targetEquipment.gridX && eq.gridY === targetEquipment.gridY;
                if (isMatch) {
                  const updatedEq = { ...eq, muscleGroup: newMuscleGroup };
                  if (selectedEquipment) {
                    setSelectedEquipment(updatedEq);
                  } else if (editingLog) {
                    setEditingLog(prev => prev ? { ...prev, equipment: updatedEq } : null);
                  }
                  return updatedEq;
                }
                return eq;
              });
              const updatedLayout = { ...layout, equipment: updatedEquipment };
              setLayout(updatedLayout);
              
              try {
                const res = await fetch('/api/layout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedLayout)
                });
                if (res.ok) {
                  const updatedLayoutData = await res.json();
                  setLayout(updatedLayoutData);
                  const updatedSelected = updatedLayoutData.equipment.find((eq: PlacedEquipment) => 
                    eq.id && targetEquipment.id ? eq.id === targetEquipment.id : eq.gridX === targetEquipment.gridX && eq.gridY === targetEquipment.gridY
                  );
                  if (updatedSelected) {
                    if (selectedEquipment) {
                      setSelectedEquipment(updatedSelected);
                    } else if (editingLog) {
                      setEditingLog(prev => prev ? { ...prev, equipment: updatedSelected } : null);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to autosave layout after muscle group change:', err);
              }
            }}
          />
        );
      })()}

      {showProfileModal && (
        <ProfileModal
          key={userProfile?.id || 'new'}
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}

export default App;

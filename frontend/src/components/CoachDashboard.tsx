import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trophy, Target, Trash2, Bot, ChevronDown, ChevronUp, CheckCircle2, Flame, RefreshCw, X, Calendar, Zap, Sparkles, Shuffle, Play } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────
interface AIRecommendation {
  title: string;
  type: 'GOAL' | 'CHALLENGE';
  metricType: 'VOLUME' | 'DISTANCE' | 'DURATION' | 'WEIGHT_MAX' | 'CUSTOM';
  targetValue: number;
  unit: string;
  deadline: string;
  aiFeedback: string;
}

interface Goal {
  id: string;
  title: string;
  type: 'GOAL' | 'CHALLENGE';
  metricType: 'VOLUME' | 'DISTANCE' | 'DURATION' | 'WEIGHT_MAX' | 'CUSTOM';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string | null;
  isCompleted: boolean;
  aiFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

type MetricType = Goal['metricType'];
type GoalType = Goal['type'];

interface NewGoalFormData {
  title: string;
  type: GoalType;
  metricType: MetricType;
  targetValue: string;
  unit: string;
  deadline: string;
  aiFeedback?: string;
}

interface PPLExercise {
  equipmentId: string | null;
  name: string;
  sets: number;
  reps: string;
  notes: string;
}

interface PPLPlan {
  push: PPLExercise[];
  pull: PPLExercise[];
  legs: PPLExercise[];
}

// ─── Constants ───────────────────────────────────────────────────────
const METRIC_OPTIONS: { value: MetricType; label: string; description: string; defaultUnit: string }[] = [
  { value: 'VOLUME', label: 'Volume (weight × reps)', description: 'Sum of weight × reps from all sets', defaultUnit: 'kg' },
  { value: 'DISTANCE', label: 'Distance', description: 'Total running/cycling distance', defaultUnit: 'km' },
  { value: 'DURATION', label: 'Duration', description: 'Total exercise time', defaultUnit: 'minutes' },
  { value: 'WEIGHT_MAX', label: 'Max Weight', description: 'Track single-set max weight', defaultUnit: 'kg' },
  { value: 'CUSTOM', label: 'Manual Completion', description: 'Manually mark as complete', defaultUnit: 'times' },
];

const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'GOAL', label: 'Long-term Goal' },
  { value: 'CHALLENGE', label: 'Challenge' },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

function getDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const end = new Date(deadline + 'T23:59:59');
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineLabel(deadline: string | null): string {
  const days = getDaysRemaining(deadline);
  if (days === null) return '';
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

function getDeadlineColor(deadline: string | null): string {
  const days = getDaysRemaining(deadline);
  if (days === null) return 'var(--text-muted-dark)';
  if (days < 0) return '#ef4444';
  if (days <= 3) return '#f97316';
  if (days <= 7) return '#eab308';
  return '#22c55e';
}

interface CoachDashboardProps {
  layout: any;
  onStartSession: (exercises: { equipmentId: string | null; sets: number }[]) => void;
}

// ─── CoachDashboard Component ────────────────────────────────────────
const CoachDashboard: React.FC<CoachDashboardProps> = ({ layout, onStartSession }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedAI, setExpandedAI] = useState<Set<string>>(new Set());
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  // AI Goals Recommendations
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [showRecs, setShowRecs] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [adoptData, setAdoptData] = useState<NewGoalFormData | undefined>(undefined);

  // AI PPL Workout Routine States
  const [pplPlan, setPplPlan] = useState<PPLPlan | null>(() => {
    const saved = localStorage.getItem('gym-ppl-plan');
    return saved ? JSON.parse(saved) : null;
  });
  const [experience, setExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [generatingPPL, setGeneratingPPL] = useState(false);
  const [activePPLDay, setActivePPLDay] = useState<'push' | 'pull' | 'legs'>('push');

  // Alternate equipment state
  const [alternateModalOpen, setAlternateModalOpen] = useState(false);
  const [exerciseToAlternate, setExerciseToAlternate] = useState<{ day: 'push' | 'pull' | 'legs'; index: number } | null>(null);

  // Save PPL Plan to localStorage
  useEffect(() => {
    if (pplPlan) {
      localStorage.setItem('gym-ppl-plan', JSON.stringify(pplPlan));
    }
  }, [pplPlan]);

  // ─── Data Fetching ───────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data: Goal[] = await res.json();
        setGoals(data);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ─── Actions ─────────────────────────────────────────────────────
  const handleCreateGoal = async (formData: NewGoalFormData) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          metricType: formData.metricType,
          targetValue: parseFloat(formData.targetValue),
          unit: formData.unit,
          deadline: formData.deadline || null,
          aiFeedback: formData.aiFeedback,
        }),
      });
      if (res.ok) {
        const newGoal: Goal = await res.json();
        setGoals((prev) => [newGoal, ...prev]);
        return true;
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
    return false;
  };

  const handleDeleteGoal = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleEvaluate = async (id: string) => {
    setEvaluatingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/goals/${id}/evaluate`, { method: 'POST' });
      if (res.ok) {
        const updated: Goal = await res.json();
        setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
        setExpandedAI((prev) => new Set(prev).add(id));
      }
    } catch (err) {
      console.error('AI evaluation failed:', err);
    } finally {
      setEvaluatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleComplete = async (goal: Goal) => {
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !goal.isCompleted }),
      });
      if (res.ok) {
        const updated: Goal = await res.json();
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
      }
    } catch (err) {
      console.error('Failed to toggle goal:', err);
    }
  };

  const toggleAIExpand = (id: string) => {
    setExpandedAI((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFetchRecommendations = async () => {
    setLoadingRecs(true);
    setShowRecs(true);
    setRecError(null);
    try {
      const res = await fetch('/api/goals/recommend');
      if (!res.ok) {
        throw new Error('Failed to fetch AI recommendations.');
      }
      const data = await res.json();
      setRecommendations(data);
    } catch (err: any) {
      console.error(err);
      setRecError(err.message || 'Unable to fetch recommendations.');
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleAdoptRecommendation = (rec: AIRecommendation) => {
    setAdoptData({
      title: rec.title,
      type: rec.type,
      metricType: rec.metricType,
      targetValue: String(rec.targetValue),
      unit: rec.unit,
      deadline: rec.deadline || '',
      aiFeedback: rec.aiFeedback
    });
    setShowCreateModal(true);
  };

  // Generate AI PPL workout routine
  const handleGeneratePPL = async () => {
    setGeneratingPPL(true);
    try {
      const res = await fetch('/api/goals/recommend-ppl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experience }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate PPL weekly routine.');
      }
      const data = await res.json();
      setPplPlan(data);
      setActivePPLDay('push');
    } catch (err) {
      console.error('Failed to generate PPL plan:', err);
      alert('AI PPL Generation failed. Please check network connection and Gemini API Key configuration.');
    } finally {
      setGeneratingPPL(false);
    }
  };

  // Scan layout to find alternate equipment
  const getAlternatesForDay = (day: 'push' | 'pull' | 'legs', originalExercise: PPLExercise) => {
    if (!layout || !layout.equipment) return [];

    let targetGroups: string[] = [];
    if (day === 'push') {
      targetGroups = ['CHEST_UPPER', 'CHEST_LOWER', 'SHOULDERS_FRONT', 'SHOULDERS_LAT', 'SHOULDERS_REAR', 'ARMS_TRICEPS', 'CARDIO'];
    } else if (day === 'pull') {
      targetGroups = ['BACK_LAT', 'BACK_UPPER', 'BACK_LOWER', 'ARMS_BICEPS', 'ARMS_FOREARM'];
    } else {
      targetGroups = ['LEGS_QUADS', 'LEGS_HAMSTRINGS', 'LEGS_GLUTES', 'LEGS_CALVES', 'CORE_ABS', 'CORE_OBLIQUE'];
    }

    const origEquip = layout.equipment.find((eq: any) => eq.id === originalExercise.equipmentId);
    const origGroup = origEquip?.muscleGroup;

    let candidates = layout.equipment.filter((eq: any) => {
      if (eq.id === originalExercise.equipmentId) return false;
      if (origGroup) {
        return eq.muscleGroup === origGroup;
      }
      return targetGroups.includes(eq.muscleGroup);
    });

    if (candidates.length === 0 && origGroup) {
      candidates = layout.equipment.filter((eq: any) => {
        if (eq.id === originalExercise.equipmentId) return false;
        return targetGroups.includes(eq.muscleGroup);
      });
    }

    return candidates;
  };

  const handleSwapExercise = (day: 'push' | 'pull' | 'legs', index: number, newEquip: any) => {
    if (!pplPlan) return;
    const updated = { ...pplPlan };
    updated[day][index] = {
      ...updated[day][index],
      equipmentId: newEquip.id,
      name: `${newEquip.customName || newEquip.type} 訓練`,
      notes: `替換為 ${newEquip.customName || newEquip.type}`
    };
    setPplPlan(updated);
    setAlternateModalOpen(false);
    setExerciseToAlternate(null);
  };

  // ─── Derived State ──────────────────────────────────────────────
  const activeGoals = goals.filter((g) => g.type === 'GOAL' && !g.isCompleted);
  const activeChallenges = goals.filter((g) => g.type === 'CHALLENGE' && !g.isCompleted);
  const completedItems = goals.filter((g) => g.isCompleted);

  // ─── Render ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="goals-dashboard">
        <div className="goals-loading">
          <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const currentRoutineDayExercises = pplPlan ? pplPlan[activePPLDay] : [];

  return (
    <div className="goals-dashboard" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        
        .btn-ai-recommend {
          background: linear-gradient(135deg, var(--gold-light) 0%, #d97706 100%);
          color: var(--bg-panel) !important;
          border: none;
          font-weight: 600;
          padding: 10px 22px !important;
          font-size: 14px !important;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(204, 163, 83, 0.25);
          transition: all 0.2s ease;
        }
        .btn-ai-recommend:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(204, 163, 83, 0.4);
          filter: brightness(1.1);
        }
        .theme-dark-purple .btn-ai-recommend {
          background: linear-gradient(135deg, var(--gold-light) 0%, #6366f1 100%);
          color: white !important;
          box-shadow: 0 4px 10px rgba(168, 85, 247, 0.25);
        }
        .theme-dark-purple .btn-ai-recommend:hover {
          box-shadow: 0 6px 14px rgba(168, 85, 247, 0.4);
        }

        .coach-grid {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .coach-card-panel {
          flex: 1 1 500px;
          min-width: 320px;
          background: var(--bg-panel-light);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .experience-select-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 8px;
        }

        .experience-dropdown {
          background-color: var(--bg-card);
          border: 1px solid var(--border-light);
          color: var(--text-dark);
          padding: 8px 12px;
          border-radius: 8px;
          outline: none;
          font-weight: 500;
        }

        .ppl-tabs {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 4px;
        }

        .ppl-tab-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: var(--text-muted-dark);
          font-weight: 600;
          font-size: 14px;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          text-transform: capitalize;
          transition: all 0.2s;
        }

        .ppl-tab-btn.active {
          background-color: var(--gold-primary);
          color: var(--bg-panel) !important;
        }

        .theme-dark-purple .ppl-tab-btn.active {
          background-color: var(--gold-light);
          color: white !important;
        }

        .ppl-exercises-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ppl-exercise-item {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: border-color 0.2s;
        }

        .ppl-exercise-item:hover {
          border-color: var(--gold-primary);
        }

        .ppl-exercise-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ppl-exercise-name {
          font-weight: 700;
          color: var(--text-dark);
          font-size: 15px;
        }

        .ppl-exercise-meta {
          font-size: 13px;
          color: var(--text-muted-dark);
        }

        .ppl-exercise-actions {
          display: flex;
          gap: 8px;
        }

        .btn-ppl-swap {
          background: rgba(var(--accent-rgb), 0.1);
          color: var(--gold-primary);
          border: 1px solid rgba(var(--accent-rgb), 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-ppl-swap:hover {
          background: var(--gold-primary);
          color: var(--bg-panel) !important;
        }

        .theme-dark-purple .btn-ppl-swap:hover {
          background: var(--gold-light);
          color: white !important;
        }

        .btn-ppl-start {
          background: linear-gradient(135deg, var(--gold-light) 0%, #d97706 100%);
          color: var(--bg-panel) !important;
          border: none;
          font-weight: 700;
          padding: 12px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(204, 163, 83, 0.25);
          width: 100%;
          transition: all 0.2;
          margin-top: 12px;
        }

        .btn-ppl-start:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(204, 163, 83, 0.4);
        }

        .theme-dark-purple .btn-ppl-start {
          background: linear-gradient(135deg, var(--gold-light) 0%, #6366f1 100%);
          color: white !important;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
        }

        .theme-dark-purple .btn-ppl-start:hover {
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
        }

        .recommendations-panel {
          background-color: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: var(--shadow-md);
        }
        .recommendations-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .recommendations-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0;
        }
        .recommendations-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted-dark);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .recommendations-close-btn:hover {
          background-color: var(--border-light);
          color: var(--text-dark);
        }
        .recommendations-error {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .recommendation-card {
          border-color: rgba(var(--accent-rgb), 0.2);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(var(--accent-rgb), 0.02) 100%);
        }
        .recommendation-card:hover {
          border-color: rgba(var(--accent-rgb), 0.5);
          box-shadow: var(--shadow-md), 0 0 0 1px rgba(var(--accent-rgb), 0.15);
        }
        .btn-adopt-goal {
          background: linear-gradient(135deg, var(--gold-light) 0%, #d97706 100%);
          color: var(--bg-panel) !important;
          border: none;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          text-align: center;
          font-size: 13px;
          transition: all 0.2s ease;
          margin-top: auto;
          box-shadow: 0 2px 6px rgba(204, 163, 83, 0.2);
        }
        .btn-adopt-goal:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(204, 163, 83, 0.35);
          filter: brightness(1.05);
        }
        .theme-dark-purple .btn-adopt-goal {
          background: linear-gradient(135deg, var(--gold-light) 0%, #6366f1 100%);
          color: white !important;
          box-shadow: 0 2px 6px rgba(168, 85, 247, 0.2);
        }
        .theme-dark-purple .btn-adopt-goal:hover {
          box-shadow: 0 4px 10px rgba(168, 85, 247, 0.35);
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="goals-header">
        <div className="goals-header-info">
          <h2 className="goals-title">
            <Trophy size={24} style={{ color: 'var(--gold-primary)' }} />
            AI Coach Center
          </h2>
          <p className="goals-subtitle">
            AI-driven planning based on your custom gym floor layout.
          </p>
        </div>
        <div className="goals-header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-ai-recommend" onClick={handleFetchRecommendations}>
            <Sparkles size={18} />
            AI Recommend Goals
          </button>
          <button className="btn-gold goals-create-btn" onClick={() => {
            setAdoptData(undefined);
            setShowCreateModal(true);
          }}>
            <Plus size={18} />
            New Goal
          </button>
        </div>
      </div>

      {/* ── AI Goal Recommendations Panel ───────────────────────── */}
      {showRecs && (
        <div className="recommendations-panel">
          <div className="recommendations-header">
            <h3 className="recommendations-title">
              <Sparkles size={18} style={{ color: 'var(--gold-primary)' }} />
              Gemini AI Goals Recommendations
            </h3>
            <button className="recommendations-close-btn" onClick={() => setShowRecs(false)}>
              <X size={20} />
            </button>
          </div>

          {recError && <div className="recommendations-error">{recError}</div>}

          {loadingRecs ? (
            <div className="recommendations-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-line skeleton-title"></div>
                  <div className="skeleton-line skeleton-badge"></div>
                  <div className="skeleton-line skeleton-text-short"></div>
                  <div className="skeleton-line skeleton-text-long"></div>
                  <div className="skeleton-line skeleton-btn"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="recommendations-grid">
              {recommendations.length === 0 && !recError && (
                <div className="recommendations-empty">No recommendations found. Try logging some workouts first!</div>
              )}
              {recommendations.map((rec, idx) => (
                <div key={idx} className="goal-card recommendation-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="goal-card-header" style={{ marginBottom: '8px' }}>
                    <h4 className="goal-card-title">{rec.title}</h4>
                    <span className={`goal-type-badge ${rec.type.toLowerCase()}`}>
                      {rec.type === 'GOAL' ? 'Goal' : 'Challenge'}
                    </span>
                  </div>
                  <div className="goal-metric-label" style={{ marginBottom: '12px' }}>
                    <Zap size={13} />
                    {METRIC_OPTIONS.find((m) => m.value === rec.metricType)?.label || rec.metricType}: {rec.targetValue} {rec.unit}
                  </div>
                  {rec.aiFeedback && (
                    <div className="goal-ai-feedback-panel" style={{ display: 'block', margin: '0 0 16px 0', padding: '10px' }}>
                      <p style={{ margin: 0, fontSize: '13px' }}>{rec.aiFeedback}</p>
                    </div>
                  )}
                  <button className="btn-adopt-goal" onClick={() => handleAdoptRecommendation(rec)}>
                    Adopt Goal
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Unified Coach Grid Layout ───────────────────────────── */}
      <div className="coach-grid">
        
        {/* Left Column: AI PPL Routines */}
        <div className="coach-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: 700 }}>
              <Bot size={20} style={{ color: 'var(--gold-primary)' }} />
              AI PPL Workout Routine
            </h3>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted-dark)', margin: 0 }}>
            Generate a personalized 3-day workout schedule that maps perfectly to your placed gym layout.
          </p>

          <div className="experience-select-bar">
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Level:</span>
            <select
              className="experience-dropdown"
              value={experience}
              onChange={(e: any) => setExperience(e.target.value)}
            >
              <option value="BEGINNER">Beginner (新手)</option>
              <option value="INTERMEDIATE">Intermediate (中階)</option>
              <option value="ADVANCED">Advanced (高階)</option>
            </select>

            <button
              className="btn-gold"
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', marginLeft: 'auto' }}
              onClick={handleGeneratePPL}
              disabled={generatingPPL}
            >
              {generatingPPL ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate PPL Plan
                </>
              )}
            </button>
          </div>

          {pplPlan ? (
            <>
              {/* Day Tab Selectors */}
              <div className="ppl-tabs">
                <button
                  className={`ppl-tab-btn ${activePPLDay === 'push' ? 'active' : ''}`}
                  onClick={() => setActivePPLDay('push')}
                >
                  Push Day (推日)
                </button>
                <button
                  className={`ppl-tab-btn ${activePPLDay === 'pull' ? 'active' : ''}`}
                  onClick={() => setActivePPLDay('pull')}
                >
                  Pull Day (拉日)
                </button>
                <button
                  className={`ppl-tab-btn ${activePPLDay === 'legs' ? 'active' : ''}`}
                  onClick={() => setActivePPLDay('legs')}
                >
                  Legs Day (腿日)
                </button>
              </div>

              {/* Exercises List */}
              <div className="ppl-exercises-list">
                {currentRoutineDayExercises.map((ex, idx) => {
                  const hasMatchedEquip = !!ex.equipmentId;
                  const equipDetails = layout?.equipment.find((eq: any) => eq.id === ex.equipmentId);
                  
                  return (
                    <div key={idx} className="ppl-exercise-item" style={{ opacity: hasMatchedEquip ? 1 : 0.65 }}>
                      <div className="ppl-exercise-info">
                        <span className="ppl-exercise-name">{ex.name}</span>
                        <span className="ppl-exercise-meta">
                          {ex.sets} Sets × {ex.reps} | {ex.notes}
                        </span>
                        {equipDetails && (
                          <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: 600 }}>
                            📍 Map Equipment: {equipDetails.customName}
                          </span>
                        )}
                        {!hasMatchedEquip && (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                            ⚠️ No placed layout machine, using default bodyweight
                          </span>
                        )}
                      </div>
                      <div className="ppl-exercise-actions">
                        <button
                          className="btn-ppl-swap"
                          onClick={() => {
                            setExerciseToAlternate({ day: activePPLDay, index: idx });
                            setAlternateModalOpen(true);
                          }}
                        >
                          <Shuffle size={12} />
                          Alternate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn-ppl-start" onClick={() => onStartSession(currentRoutineDayExercises)}>
                <Play size={16} fill="currentColor" />
                Start Today's Session
              </button>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--border-light)',
              borderRadius: '12px',
              padding: '40px',
              color: 'var(--text-muted-dark)',
              textAlign: 'center'
            }}>
              <Bot size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No routine generated yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Select your experience level above and click "Generate PPL Plan" to get started.</p>
            </div>
          )}
        </div>

        {/* Right Column: Goals & Challenges */}
        <div className="coach-card-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: 700 }}>
              <Target size={20} style={{ color: 'var(--gold-primary)' }} />
              Goals & Challenges
            </h3>
            {completedItems.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Show Completed ({completedItems.length})
              </label>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '500px', paddingRight: '4px' }}>
            {goals.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed var(--border-light)',
                borderRadius: '12px',
                padding: '40px',
                color: 'var(--text-muted-dark)',
                textAlign: 'center'
              }}>
                <Trophy size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No goals or challenges active.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Set your custom fitness goals or let AI recommend them based on your history.</p>
              </div>
            ) : (
              <>
                {/* Active Goals Section */}
                {activeGoals.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--gold-primary)' }}>Active Goals</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeGoals.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          isAIExpanded={expandedAI.has(goal.id)}
                          isEvaluating={evaluatingIds.has(goal.id)}
                          isDeleting={deletingIds.has(goal.id)}
                          onToggleAI={toggleAIExpand}
                          onEvaluate={handleEvaluate}
                          onDelete={handleDeleteGoal}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Challenges Section */}
                {activeChallenges.length > 0 && (
                  <div>
                    <h4 style={{ margin: '14px 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--gold-primary)' }}>Active Challenges</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeChallenges.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          isAIExpanded={expandedAI.has(goal.id)}
                          isEvaluating={evaluatingIds.has(goal.id)}
                          isDeleting={deletingIds.has(goal.id)}
                          onToggleAI={toggleAIExpand}
                          onEvaluate={handleEvaluate}
                          onDelete={handleDeleteGoal}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Goals/Challenges Section */}
                {showCompleted && completedItems.length > 0 && (
                  <div>
                    <h4 style={{ margin: '14px 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>Completed</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {completedItems.map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          isAIExpanded={expandedAI.has(goal.id)}
                          isEvaluating={evaluatingIds.has(goal.id)}
                          isDeleting={deletingIds.has(goal.id)}
                          onToggleAI={toggleAIExpand}
                          onEvaluate={handleEvaluate}
                          onDelete={handleDeleteGoal}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Goal Modal ────────────────────────────────────── */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => {
            setShowCreateModal(false);
            setAdoptData(undefined);
          }}
          onCreate={handleCreateGoal}
          initialData={adoptData}
        />
      )}

      {/* ── Alternate Equipment Modal Switcher ─────────────────────── */}
      {alternateModalOpen && exerciseToAlternate && pplPlan && (
        (() => {
          const { day, index } = exerciseToAlternate;
          const origExercise = pplPlan[day][index];
          const alternates = getAlternatesForDay(day, origExercise);

          return (
            <div className="modal-overlay" onClick={() => {
              setAlternateModalOpen(false);
              setExerciseToAlternate(null);
            }}>
              <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Select Alternate Equipment</h3>
                  <button className="modal-close-btn" onClick={() => {
                    setAlternateModalOpen(false);
                    setExerciseToAlternate(null);
                  }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '14px', margin: '0 0 16px 0', color: 'var(--text-muted-dark)' }}>
                    Original Exercise: <strong>{origExercise.name}</strong><br />
                    Select an alternative machine from your placed gym layout to swap:
                  </p>
                  
                  {alternates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
                      No alternative equipment placed in your current layout that matches this workout group. Place more machines on the canvas to unlock alternates.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {alternates.map((eq: any) => (
                        <div
                          key={eq.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s'
                          }}
                          onClick={() => handleSwapExercise(day, index, eq)}
                          className="ppl-alternate-row"
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>{eq.customName || eq.type}</div>
                            <div style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: 600 }}>Muscle: {eq.muscleGroup}</div>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Select ➔</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// GoalCard Sub-Component
// ═══════════════════════════════════════════════════════════════════════
interface GoalCardProps {
  goal: Goal;
  isAIExpanded: boolean;
  isEvaluating: boolean;
  isDeleting: boolean;
  onToggleAI: (id: string) => void;
  onEvaluate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleComplete: (goal: Goal) => Promise<void>;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isAIExpanded,
  isEvaluating,
  isDeleting,
  onToggleAI,
  onEvaluate,
  onDelete,
  onToggleComplete,
}) => {
  const isCustom = goal.metricType === 'CUSTOM';
  const progressPercent = getProgressPercent(goal.currentValue, goal.targetValue);
  const deadlineLabel = getDeadlineLabel(goal.deadline);
  const deadlineColor = getDeadlineColor(goal.deadline);

  return (
    <div className={`goal-card ${goal.isCompleted ? 'completed' : ''}`}>
      <div className="goal-card-header">
        <h4 className="goal-card-title">{goal.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`goal-type-badge ${goal.type.toLowerCase()}`}>
            {goal.type === 'GOAL' ? 'Goal' : 'Challenge'}
          </span>
          <button
            className="goal-delete-btn"
            onClick={() => onDelete(goal.id)}
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {/* Progress Bars */}
      {!isCustom && (
        <div className="goal-progress-section">
          <div className="goal-progress-meta">
            <span className="goal-progress-value">
              {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {goal.unit}
            </span>
            <span className="goal-progress-percent">{progressPercent}%</span>
          </div>
          <div className="goal-progress-bar-container">
            <div
              className="goal-progress-bar"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="goal-actions">
        <button
          className={`goal-status-toggle-btn ${goal.isCompleted ? 'completed' : ''}`}
          onClick={() => onToggleComplete(goal)}
        >
          <CheckCircle2 size={15} />
          {goal.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        </button>
      </div>

      {/* Custom metric completed state */}
      {isCustom && goal.isCompleted && (
        <div className="goal-custom-completed">
          <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
          <span>Goal completed</span>
        </div>
      )}

      {/* Deadline */}
      {deadlineLabel && (
        <div className="goal-deadline" style={{ color: deadlineColor }}>
          <Calendar size={14} />
          <span>{deadlineLabel}</span>
          <span className="goal-deadline-date">({goal.deadline})</span>
        </div>
      )}

      {/* Metric type label */}
      <div className="goal-metric-label">
        <Zap size={13} />
        {METRIC_OPTIONS.find((m) => m.value === goal.metricType)?.label || goal.metricType}
      </div>

      {/* AI Evaluate Section */}
      <div className="goal-ai-section">
        {goal.aiFeedback ? (
          <button className="goal-ai-toggle" onClick={() => onToggleAI(goal.id)}>
            <Bot size={16} style={{ color: 'var(--gold-primary)' }} />
            AI Coach Evaluation
            {isAIExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <button
            className="goal-ai-request-btn"
            onClick={() => onEvaluate(goal.id)}
            disabled={isEvaluating}
          >
            {isEvaluating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Bot size={14} />
                Request AI Evaluation
              </>
            )}
          </button>
        )}

        {isAIExpanded && goal.aiFeedback && (
          <div className="goal-ai-feedback-panel">
            <p>{goal.aiFeedback}</p>
            <button
              className="goal-ai-refresh-btn"
              onClick={() => onEvaluate(goal.id)}
              disabled={isEvaluating}
            >
              {isEvaluating ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Re-evaluate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// CreateGoalModal Sub-Component
// ═══════════════════════════════════════════════════════════════════════
interface CreateGoalModalProps {
  onClose: () => void;
  onCreate: (data: NewGoalFormData) => Promise<boolean | void>;
  initialData?: NewGoalFormData;
}

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ onClose, onCreate, initialData }) => {
  const [formData, setFormData] = useState<NewGoalFormData>(() => initialData || {
    title: '',
    type: 'GOAL',
    metricType: 'VOLUME',
    targetValue: '',
    unit: 'kg',
    deadline: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === formData.metricType);

  const handleMetricChange = (metricType: MetricType) => {
    const metric = METRIC_OPTIONS.find((m) => m.value === metricType);
    setFormData((prev) => ({
      ...prev,
      metricType,
      unit: metric?.defaultUnit || prev.unit,
      targetValue: metricType === 'CUSTOM' ? '1' : (prev.targetValue === '1' && prev.metricType === 'CUSTOM' ? '' : prev.targetValue),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = formData.metricType === 'CUSTOM' && !formData.targetValue ? '1' : formData.targetValue;
    if (!formData.title.trim() || !targetVal) return;
    setIsSubmitting(true);
    const success = await onCreate({ ...formData, targetValue: targetVal });
    if (!success) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Training Goal</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="goal-create-form">
            {/* Goal Title */}
            <div className="goal-form-group">
              <label className="goal-form-label">Goal Title</label>
              <input
                type="text"
                className="equipment-search"
                placeholder="e.g. Squat 100kg, Run 50km this month"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Goal Type */}
            <div className="goal-form-group">
              <label className="goal-form-label">Goal Type</label>
              <div className="goal-type-selector">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`goal-type-option ${formData.type === opt.value ? 'active' : ''}`}
                    onClick={() => setFormData((prev) => ({ ...prev, type: opt.value }))}
                  >
                    <span>{opt.value === 'GOAL' ? <Target size={14} /> : <Flame size={14} />}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Type */}
            <div className="goal-form-group">
              <label className="goal-form-label">Tracking Method</label>
              <div className="goal-metric-selector">
                {METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`goal-metric-option ${formData.metricType === opt.value ? 'active' : ''}`}
                    onClick={() => handleMetricChange(opt.value)}
                  >
                    <span className="metric-label">{opt.label}</span>
                    <span className="metric-desc">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Value + Unit */}
            {formData.metricType !== 'CUSTOM' && (
              <div className="goal-form-row">
                <div className="goal-form-group" style={{ flex: 2 }}>
                  <label className="goal-form-label">Target Value</label>
                  <input
                    type="number"
                    className="equipment-search"
                    placeholder="e.g. 5000"
                    min="0.1"
                    step="any"
                    value={formData.targetValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetValue: e.target.value }))}
                  />
                </div>
                <div className="goal-form-group" style={{ flex: 1 }}>
                  <label className="goal-form-label">Unit</label>
                  <input
                    type="text"
                    className="equipment-search"
                    placeholder={selectedMetric?.defaultUnit || 'kg'}
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Deadline */}
            <div className="goal-form-group">
              <label className="goal-form-label">Deadline (optional)</label>
              <input
                type="date"
                className="equipment-search"
                value={formData.deadline}
                onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            {/* Submit */}
            <div className="goal-form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-gold"
                disabled={isSubmitting || !formData.title.trim() || (formData.metricType !== 'CUSTOM' && !formData.targetValue)}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Goal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;

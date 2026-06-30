import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trophy, Target, Trash2, Bot, ChevronDown, ChevronUp, CheckCircle2, Flame, RefreshCw, X, Calendar, Zap, Sparkles } from 'lucide-react';

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

// ─── GoalsDashboard Component ────────────────────────────────────────
const GoalsDashboard: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedAI, setExpandedAI] = useState<Set<string>>(new Set());
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [showRecs, setShowRecs] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [adoptData, setAdoptData] = useState<NewGoalFormData | undefined>(undefined);

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

  // ─── Derived State ──────────────────────────────────────────────
  const activeGoals = goals.filter((g) => g.type === 'GOAL' && !g.isCompleted);
  const activeChallenges = goals.filter((g) => g.type === 'CHALLENGE' && !g.isCompleted);
  const completedItems = goals.filter((g) => g.isCompleted);
  const totalActive = activeGoals.length + activeChallenges.length;

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

  return (
    <div className="goals-dashboard">
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .4;
          }
        }
        
        /* Adaptive styles for AI buttons & cards */
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
        
        .btn-ai-recommend:active {
          transform: translateY(0);
        }

        .theme-dark-purple .btn-ai-recommend {
          background: linear-gradient(135deg, var(--gold-light) 0%, #6366f1 100%);
          color: white !important;
          box-shadow: 0 4px 10px rgba(168, 85, 247, 0.25);
        }

        .theme-dark-purple .btn-ai-recommend:hover {
          box-shadow: 0 6px 14px rgba(168, 85, 247, 0.4);
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

        .recommendations-empty {
          grid-column: 1 / -1;
          text-align: center;
          color: var(--text-muted-dark);
          padding: 20px 0;
          font-size: 14px;
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
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(168, 85, 247, 0.35);
          filter: brightness(1.05);
        }

        /* Skeleton Styles */
        .skeleton-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .skeleton-line {
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-title {
          height: 18px;
          width: 70%;
        }

        .skeleton-badge {
          height: 20px;
          width: 35%;
          border-radius: 9999px;
        }

        .skeleton-text-short {
          height: 14px;
          width: 50%;
        }

        .skeleton-text-long {
          height: 48px;
          width: 100%;
          border-radius: 8px;
        }

        .skeleton-btn {
          height: 36px;
          width: 100%;
          border-radius: 10px;
        }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="goals-header">
        <div className="goals-header-info">
          <h2 className="goals-title">
            <Trophy size={24} style={{ color: 'var(--gold-primary)' }} />
            Goals & Challenges
          </h2>
          <p className="goals-subtitle">
            {totalActive > 0
              ? `${totalActive} active · ${completedItems.length} completed`
              : 'No goals yet. Start setting your first one!'}
          </p>
        </div>
        <div className="goals-header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-ai-recommend" onClick={handleFetchRecommendations}>
            <Sparkles size={18} />
            AI Recommend
          </button>
          <button className="btn-gold goals-create-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            New Goal
          </button>
        </div>
      </div>

      {/* ── AI Recommendations Panel ─────────────────────────────────── */}
      {showRecs && (
        <div className="recommendations-panel">
          <div className="recommendations-header">
            <h3 className="recommendations-title">
              <Sparkles size={18} style={{ color: '#a855f7' }} />
              AI Recommended Goals & Challenges
            </h3>
            <button className="recommendations-close-btn" onClick={() => setShowRecs(false)}>
              <X size={16} />
            </button>
          </div>

          {recError && (
            <div className="recommendations-error">
              {recError}
            </div>
          )}

          {loadingRecs ? (
            <div className="recommendations-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="skeleton-card">
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
                <p className="recommendations-empty">No recommendations found. Try again later!</p>
              )}
              {recommendations.map((rec, idx) => (
                <div key={idx} className="goal-card recommendation-card">
                  <div className="goal-card-header">
                    <div className="goal-card-header-left">
                      <span className="goal-type-badge" data-type={rec.type}>
                        {rec.type === 'GOAL' ? <Target size={14} /> : <Flame size={14} />}
                        {rec.type === 'GOAL' ? 'Goal' : 'Challenge'}
                      </span>
                      <h4 className="goal-card-title">{rec.title}</h4>
                    </div>
                  </div>

                  <div className="recommendation-meta">
                    <span className="goal-metric-label" style={{ margin: 0 }}>
                      <Zap size={13} />
                      {METRIC_OPTIONS.find((m) => m.value === rec.metricType)?.label || rec.metricType}: {rec.targetValue} {rec.unit}
                    </span>
                  </div>

                  {rec.deadline && (
                    <div className="goal-deadline" style={{ color: 'var(--text-muted-dark)', margin: 0 }}>
                      <Calendar size={14} />
                      <span>Due by {rec.deadline}</span>
                    </div>
                  )}

                  <div className="goal-ai-feedback-panel" style={{ display: 'block', marginTop: 'auto' }}>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>{rec.aiFeedback}</p>
                  </div>

                  <button
                    className="btn-adopt-goal"
                    onClick={() => handleAdoptRecommendation(rec)}
                  >
                    Adopt Goal
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Summary Stats ────────────────────────────────────────── */}
      {goals.length > 0 && (
        <div className="goals-stats-row">
          <div className="goals-stat-card">
            <Target size={20} style={{ color: 'var(--gold-primary)' }} />
            <div>
              <span className="stat-value">{activeGoals.length}</span>
              <span className="stat-label">Long-term Goals</span>
            </div>
          </div>
          <div className="goals-stat-card">
            <Flame size={20} style={{ color: '#f97316' }} />
            <div>
              <span className="stat-value">{activeChallenges.length}</span>
              <span className="stat-label">Challenges</span>
            </div>
          </div>
          <div className="goals-stat-card">
            <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
            <div>
              <span className="stat-value">{completedItems.length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {goals.length === 0 && (
        <div className="goals-empty-state">
          <div className="goals-empty-icon"><Target size={48} style={{ color: 'var(--gold-primary)' }} /></div>
          <h3>Start Your Fitness Journey</h3>
          <p>Set goals to track your progress. Let AI coach evaluate your plan.</p>
          <button className="btn-gold" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Create First Goal
          </button>
        </div>
      )}

      {/* ── Active Goals Section ─────────────────────────────────── */}
      {activeGoals.length > 0 && (
        <div className="goals-section">
          <h3 className="goals-section-title">
            <Target size={18} /> Long-term Goals
          </h3>
          <div className="goals-grid">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isAIExpanded={expandedAI.has(goal.id)}
                isEvaluating={evaluatingIds.has(goal.id)}
                isDeleting={deletingIds.has(goal.id)}
                onEvaluate={handleEvaluate}
                onDelete={handleDeleteGoal}
                onToggleAI={toggleAIExpand}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Active Challenges Section ────────────────────────────── */}
      {activeChallenges.length > 0 && (
        <div className="goals-section">
          <h3 className="goals-section-title">
            <Flame size={18} style={{ color: '#f97316' }} /> Challenges
          </h3>
          <div className="goals-grid">
            {activeChallenges.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isAIExpanded={expandedAI.has(goal.id)}
                isEvaluating={evaluatingIds.has(goal.id)}
                isDeleting={deletingIds.has(goal.id)}
                onEvaluate={handleEvaluate}
                onDelete={handleDeleteGoal}
                onToggleAI={toggleAIExpand}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Completed Section Toggle ─────────────────────────────── */}
      {completedItems.length > 0 && (
        <div className="goals-section">
          <button className="goals-completed-toggle" onClick={() => setShowCompleted((p) => !p)}>
            <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
            Completed ({completedItems.length})
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showCompleted && (
            <div className="goals-grid goals-completed-grid">
              {completedItems.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isAIExpanded={expandedAI.has(goal.id)}
                  isEvaluating={evaluatingIds.has(goal.id)}
                  isDeleting={deletingIds.has(goal.id)}
                  onEvaluate={handleEvaluate}
                  onDelete={handleDeleteGoal}
                  onToggleAI={toggleAIExpand}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Goal Modal ────────────────────────────────────── */}
      {showCreateModal && (
        <CreateGoalModal
          initialData={adoptData}
          onClose={() => {
            setShowCreateModal(false);
            setAdoptData(undefined);
          }}
          onCreate={async (formData) => {
            const success = await handleCreateGoal(formData);
            if (success) {
              if (adoptData) {
                setRecommendations((prev) => prev.filter((r) => r.title !== adoptData.title));
                setAdoptData(undefined);
              }
              setShowCreateModal(false);
            }
            return success;
          }}
        />
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
  onEvaluate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleAI: (id: string) => void;
  onToggleComplete: (goal: Goal) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isAIExpanded,
  isEvaluating,
  isDeleting,
  onEvaluate,
  onDelete,
  onToggleAI,
  onToggleComplete,
}) => {
  const percent = getProgressPercent(goal.currentValue, goal.targetValue);
  const deadlineLabel = getDeadlineLabel(goal.deadline);
  const deadlineColor = getDeadlineColor(goal.deadline);
  const isCustom = goal.metricType === 'CUSTOM';

  return (
    <div className={`goal-card ${goal.isCompleted ? 'goal-card--completed' : ''}`}>
      {/* Card Header */}
      <div className="goal-card-header">
        <div className="goal-card-header-left">
          <span className="goal-type-badge" data-type={goal.type}>
            {goal.type === 'GOAL' ? <Target size={14} /> : <Flame size={14} />}
            {goal.type === 'GOAL' ? 'Goal' : 'Challenge'}
          </span>
          <h4 className="goal-card-title">{goal.title}</h4>
        </div>
        <div className="goal-card-actions">
          {isCustom && (
            <button
              className={`goal-check-btn ${goal.isCompleted ? 'checked' : ''}`}
              onClick={() => onToggleComplete(goal)}
              title={goal.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            >
              <CheckCircle2 size={20} />
            </button>
          )}
          <button
            className="goal-delete-btn"
            onClick={() => onDelete(goal.id)}
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {!isCustom && (
        <div className="goal-progress-section">
          <div className="goal-progress-info">
            <span className="goal-progress-values">
              {formatNumber(goal.currentValue)} / {formatNumber(goal.targetValue)} {goal.unit}
            </span>
            <span className={`goal-progress-percent ${goal.isCompleted ? 'completed' : ''}`}>
              {goal.isCompleted ? 'Done!' : `${percent}%`}
            </span>
          </div>
          <div className="goal-progress-bar-track">
            <div
              className={`goal-progress-bar-fill ${goal.isCompleted ? 'completed' : ''}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

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

export default GoalsDashboard;

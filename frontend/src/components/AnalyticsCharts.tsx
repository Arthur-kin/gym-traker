import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { Award, TrendingUp, Calendar, ArrowRight, ShieldAlert, Activity, Edit2, Trash2 } from 'lucide-react';
import { WorkoutLog } from '../App';
import { useToast } from './Toast';

interface AnalyticsChartsProps {
  logs: WorkoutLog[];
  onDeleteLog?: (logId: string) => Promise<boolean>;
  onEditLog?: (log: WorkoutLog) => void;
}

const MUSCLE_DETAILS: Record<string, { label: string; parent: string }> = {
  ANY: { label: 'Any / Compound (複合肌群)', parent: 'ANY' },
  CHEST_UPPER: { label: 'Upper Chest (上胸)', parent: 'CHEST' },
  CHEST_LOWER: { label: 'Lower Chest (中下胸)', parent: 'CHEST' },
  BACK_LAT: { label: 'Lats (背闊肌)', parent: 'BACK' },
  BACK_UPPER: { label: 'Upper Back (上背斜方)', parent: 'BACK' },
  BACK_LOWER: { label: 'Lower Back (豎脊肌)', parent: 'BACK' },
  SHOULDERS_FRONT: { label: 'Front Delt (前三角)', parent: 'SHOULDERS' },
  SHOULDERS_LAT: { label: 'Lateral Delt (側三角)', parent: 'SHOULDERS' },
  SHOULDERS_REAR: { label: 'Rear Delt (後三角)', parent: 'SHOULDERS' },
  ARMS_BICEPS: { label: 'Biceps (二頭肌)', parent: 'ARMS' },
  ARMS_TRICEPS: { label: 'Triceps (三頭肌)', parent: 'ARMS' },
  ARMS_FOREARM: { label: 'Forearms (前臂)', parent: 'ARMS' },
  LEGS_QUADS: { label: 'Quads (股四頭)', parent: 'LEGS' },
  LEGS_HAMSTRINGS: { label: 'Hamstrings (後腿)', parent: 'LEGS' },
  LEGS_GLUTES: { label: 'Glutes (臀肌)', parent: 'LEGS' },
  LEGS_CALVES: { label: 'Calves (小腿)', parent: 'LEGS' },
  CORE_ABS: { label: 'Abs (腹直肌)', parent: 'CORE' },
  CORE_OBLIQUE: { label: 'Obliques (側腹)', parent: 'CORE' },
  CARDIO: { label: 'Cardio (心肺)', parent: 'CARDIO' }
};

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ logs, onDeleteLog, onEditLog }) => {
  const { showToast } = useToast();
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ANY');
  const [historySearch, setHistorySearch] = useState('');
  const [historyMuscleFilter, setHistoryMuscleFilter] = useState('ALL');
  const [visibleLogsCount, setVisibleLogsCount] = useState(15);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState<{
    stats: { totalDays: number; totalSets: number; muscleDistribution: Record<string, number> };
    coachFeedback: string;
    isRealAI: boolean;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isWaitingForChat, setIsWaitingForChat] = useState(false);

  // Filter logs for the history logs table
  const filteredHistoryLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = (log.equipment?.customName || '').toLowerCase().includes(historySearch.toLowerCase());
      const matchesMuscle = historyMuscleFilter === 'ALL' || (log.equipment?.muscleGroup || 'ANY') === historyMuscleFilter;
      return matchesSearch && matchesMuscle;
    });
  }, [logs, historySearch, historyMuscleFilter]);

  // 1. Calculate muscle activation sets count (recent 30 days)
  const muscleActivation = useMemo(() => {
    const counts: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    logs.forEach(log => {
      const logDate = new Date(log.loggedAt);
      if (logDate >= thirtyDaysAgo) {
        const group = log.equipment?.muscleGroup || 'ANY';
        counts[group] = (counts[group] || 0) + log.sets.length;
      }
    });
    return counts;
  }, [logs]);

  // Max sets to normalize heatmap opacity (0.15 - 1.0)
  const maxSets = useMemo(() => {
    const values = Object.values(muscleActivation);
    return values.length > 0 ? Math.max(...values, 1) : 1;
  }, [muscleActivation]);

  const getMuscleOpacity = (muscleKey: string) => {
    const sets = muscleActivation[muscleKey] || 0;
    if (sets === 0) return 0.05;
    return 0.15 + (sets / maxSets) * 0.85;
  };

  // 2. Calculate progression data for selected muscle group
  const progressData = useMemo(() => {
    const filteredLogs = logs.filter(log => {
      const eqGroup = log.equipment?.muscleGroup || 'ANY';
      if (selectedMuscle === 'ANY') return true;
      return eqGroup === selectedMuscle;
    });

    const dailyData: Record<string, { date: Date; maxWeight: number; totalLoad: number }> = {};
    
    filteredLogs.forEach(log => {
      const date = new Date(log.loggedAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      const eqGroup = log.equipment?.muscleGroup || 'ANY';
      const isCardio = eqGroup === 'CARDIO';
      const sessionMax = log.sets.reduce((max, s) => s.weight > max ? s.weight : max, 0);
      const sessionLoad = log.sets.reduce((sum, s) => sum + (isCardio ? s.reps : s.weight * s.reps), 0);

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date,
          maxWeight: sessionMax,
          totalLoad: sessionLoad
        };
      } else {
        dailyData[dateKey].maxWeight = Math.max(dailyData[dateKey].maxWeight, sessionMax);
        dailyData[dateKey].totalLoad += sessionLoad;
      }
    });

    return Object.entries(dailyData)
      .map(([_, val]) => {
        const d = val.date;
        return {
          dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
          dateFull: d.toLocaleDateString(),
          timestamp: d.getTime(),
          maxWeight: Math.round(val.maxWeight * 10) / 10,
          totalLoad: Math.round(val.totalLoad * 10) / 10,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [logs, selectedMuscle]);

  // 3. Daily Activity (Bar Chart - last 7 workout days)
  const dailyActivityData = useMemo(() => {
    const dailyMap: Record<string, { displayDate: string; setsCount: number; timestamp: number }> = {};
    logs.forEach(log => {
      const date = new Date(log.loggedAt);
      const groupKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!dailyMap[groupKey]) {
        dailyMap[groupKey] = {
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
          setsCount: log.sets.length,
          timestamp: date.getTime()
        };
      } else {
        dailyMap[groupKey].setsCount += log.sets.length;
      }
    });

    return Object.values(dailyMap)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 7)
      .map(({ displayDate, setsCount }) => ({ date: displayDate, setsCount }))
      .reverse();
  }, [logs]);

  // 4. Personal Records (PR) in KG
  const personalRecords = useMemo(() => {
    const prMap: Record<string, { weight: number; reps: number; date: string; muscleGroup: string }> = {};
    logs.forEach(log => {
      const eqName = log.equipment?.customName || 'Unknown';
      const eqGroup = log.equipment?.muscleGroup || 'ANY';
      log.sets.forEach(set => {
        if (!prMap[eqName] || set.weight > prMap[eqName].weight) {
          const date = new Date(log.loggedAt);
          prMap[eqName] = {
            weight: set.weight,
            reps: set.reps,
            muscleGroup: eqGroup,
            date: `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
          };
        }
      });
    });

    return Object.entries(prMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.weight - a.weight);
  }, [logs]);

  // Generate list of months that have logs, plus the current month
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentMonthStr);

    logs.forEach(log => {
      if (log.loggedAt) {
        const date = new Date(log.loggedAt);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthStr);
      }
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    setReportData(null); // Reset report when month changes to prevent mismatch
  };

  const handleGenerateMonthlyReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/logs/monthly-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth, model: selectedModel })
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        showToast('Failed to generate report. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error fetching monthly report:', err);
      showToast('An error occurred. Check your connection.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (reportData) {
      const saved = localStorage.getItem(`gym_chat_${selectedMonth}`);
      if (saved) {
        try {
          setChatHistory(JSON.parse(saved));
        } catch (e) {
          setChatHistory([]);
        }
      } else {
        setChatHistory([]);
      }
    } else {
      setChatHistory([]);
    }
  }, [selectedMonth, reportData]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !reportData || isWaitingForChat) return;

    const userMessage = chatInput.trim();
    const previousHistory = chatHistory;
    const updatedHistory = [...chatHistory, { role: 'user' as const, content: userMessage }];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsWaitingForChat(true);

    try {
      const res = await fetch('/api/logs/monthly-analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: reportData.stats,
          coachFeedback: reportData.coachFeedback,
          history: chatHistory.slice(-10),
          message: userMessage,
          model: selectedModel
        })
      });

      if (res.ok) {
        const data = await res.json();
        const nextHistory = [...updatedHistory, { role: 'model' as const, content: data.response }];
        setChatHistory(nextHistory);
        try {
          localStorage.setItem(`gym_chat_${selectedMonth}`, JSON.stringify(nextHistory));
        } catch (storageErr) {
          console.error('Failed to save chat history to localStorage:', storageErr);
        }
      } else {
        showToast('AI coach error. Please try again.', 'error');
        setChatHistory(previousHistory); // Rollback state
      }
    } catch (err) {
      console.error('Chat error:', err);
      showToast('Network error. Please check your connection.', 'error');
      setChatHistory(previousHistory); // Rollback state
    } finally {
      setIsWaitingForChat(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear chat history for this report?')) {
      setChatHistory([]);
      try {
        localStorage.removeItem(`gym_chat_${selectedMonth}`);
      } catch (storageErr) {
        console.error('Failed to remove chat history from localStorage:', storageErr);
      }
    }
  };

  // Custom tooltips
  const renderLineChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const isCardio = selectedMuscle === 'CARDIO';
      return (
        <div style={{ backgroundColor: 'var(--bg-panel-light)', border: '1px solid var(--border-dark)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text-light)' }}>
          <p style={{ fontWeight: 600, marginBottom: '6px', borderBottom: '1px solid var(--border-dark)', paddingBottom: '4px' }}>
            {payload[0].payload.dateFull}
          </p>
          <p style={{ color: 'var(--gold-primary)', margin: '2px 0' }}>
            {isCardio ? 'Max Distance' : 'Max Weight'}: <strong>{payload[0].value} {isCardio ? 'km' : 'kg'}</strong>
          </p>
          {payload[1] && (
            <p style={{ color: 'var(--text-light)', opacity: 0.8, margin: '2px 0' }}>
              {isCardio ? 'Total Duration' : 'Total Load'}: <strong>{payload[1].value} {isCardio ? 'mins' : 'kg'}</strong>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Left panel - Muscle Heatmap & Progression Charts */}
      <section style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', backgroundColor: 'var(--bg-page)' }}>
        
        {/* Row 1: Interactive Heatmap Dashboard */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <Activity style={{ color: 'var(--gold-primary)' }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>Muscle Heatmap</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '2px' }}>Click a body region to view its strength evolution trend</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', minHeight: '260px', flexWrap: 'wrap', gap: '20px' }}>
            
            {/* FRONT BODY SVG */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>ANTERIOR</div>
              <svg width="120" height="240" viewBox="0 0 100 220" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--gold-light)" />
                    <stop offset="100%" stopColor="var(--gold-primary)" />
                  </linearGradient>
                </defs>

                {/* Head, neck & body outlines */}
                <ellipse cx="50" cy="18" rx="8" ry="11" fill="none" stroke="var(--text-muted-dark)" strokeWidth="1" />
                <path d="M47 28 L47 34 L53 34 L53 28 Z" fill="none" stroke="var(--text-muted-dark)" strokeWidth="1" />

                {/* Chest Upper */}
                <path d="M34 40 C42 42 48 42 50 43 C52 42 58 42 66 40 L64 48 C55 50 51 51 50 51 C49 51 45 50 36 48 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CHEST_UPPER')} 
                  stroke={selectedMuscle === 'CHEST_UPPER' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CHEST_UPPER' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CHEST_UPPER')} 
                />
                
                {/* Chest Lower */}
                <path d="M36 49 C45 51 49 52 50 52 C51 52 55 51 64 49 L62 60 C54 62 51 63 50 63 C49 63 46 62 38 60 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CHEST_LOWER')} 
                  stroke={selectedMuscle === 'CHEST_LOWER' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CHEST_LOWER' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CHEST_LOWER')} 
                />

                {/* Shoulders - Front Delt */}
                <path d="M28 38 C24 41 23 48 27 50 C29 46 31 42 33 40 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_FRONT')} 
                  stroke={selectedMuscle === 'SHOULDERS_FRONT' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_FRONT' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_FRONT')} 
                />
                <path d="M72 38 C76 41 77 48 73 50 C71 46 69 42 67 40 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_FRONT')} 
                  stroke={selectedMuscle === 'SHOULDERS_FRONT' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_FRONT' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_FRONT')} 
                />

                {/* Shoulders - Lateral Delt */}
                <path d="M23 44 C20 49 22 56 25 56 C25 51 26 47 27 45 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_LAT')} 
                  stroke={selectedMuscle === 'SHOULDERS_LAT' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_LAT' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_LAT')} 
                />
                <path d="M77 44 C80 49 78 56 75 56 C75 51 74 47 73 45 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_LAT')} 
                  stroke={selectedMuscle === 'SHOULDERS_LAT' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_LAT' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_LAT')} 
                />

                {/* Arms - Biceps */}
                <path d="M25 57 C22 64 24 72 27 72 C27 67 27 62 26 57 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_BICEPS')} 
                  stroke={selectedMuscle === 'ARMS_BICEPS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_BICEPS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_BICEPS')} 
                />
                <path d="M75 57 C78 64 76 72 73 72 C73 67 73 62 74 57 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_BICEPS')} 
                  stroke={selectedMuscle === 'ARMS_BICEPS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_BICEPS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_BICEPS')} 
                />

                {/* Arms - Forearm */}
                <path d="M27 73 L23 103 L28 103 L28 73 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_FOREARM')} 
                  stroke={selectedMuscle === 'ARMS_FOREARM' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_FOREARM' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_FOREARM')} 
                />
                <path d="M73 73 L77 103 L72 103 L72 73 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_FOREARM')} 
                  stroke={selectedMuscle === 'ARMS_FOREARM' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_FOREARM' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_FOREARM')} 
                />

                {/* Abs - Core Upper */}
                <path d="M43 65 L57 65 L56 78 L44 78 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CORE_ABS')} 
                  stroke={selectedMuscle === 'CORE_ABS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CORE_ABS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CORE_ABS')} 
                />

                {/* Abs - Core Lower */}
                <path d="M44 79 L56 79 L55 95 L45 95 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CORE_ABS')} 
                  stroke={selectedMuscle === 'CORE_ABS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CORE_ABS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CORE_ABS')} 
                />

                {/* Obliques */}
                <path d="M37 66 L42 78 L43 95 L37 80 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CORE_OBLIQUE')} 
                  stroke={selectedMuscle === 'CORE_OBLIQUE' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CORE_OBLIQUE' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CORE_OBLIQUE')} 
                />
                <path d="M63 66 L58 78 L57 95 L63 80 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('CORE_OBLIQUE')} 
                  stroke={selectedMuscle === 'CORE_OBLIQUE' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'CORE_OBLIQUE' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('CORE_OBLIQUE')} 
                />

                {/* Legs - Quads */}
                <path d="M34 105 L48 107 L45 155 L32 150 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_QUADS')} 
                  stroke={selectedMuscle === 'LEGS_QUADS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_QUADS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_QUADS')} 
                />
                <path d="M66 105 L52 107 L55 155 L68 150 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_QUADS')} 
                  stroke={selectedMuscle === 'LEGS_QUADS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_QUADS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_QUADS')} 
                />
              </svg>
            </div>

            {/* BACK BODY SVG */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px' }}>POSTERIOR</div>
              <svg width="120" height="240" viewBox="0 0 100 220" style={{ overflow: 'visible' }}>
                <ellipse cx="50" cy="18" rx="8" ry="11" fill="none" stroke="var(--text-muted-dark)" strokeWidth="1" />

                {/* Upper Back / Traps */}
                <path d="M42 29 Q50 34 58 29 L68 38 L32 38 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('BACK_UPPER')} 
                  stroke={selectedMuscle === 'BACK_UPPER' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'BACK_UPPER' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('BACK_UPPER')} 
                />
                <path d="M32 39 L68 39 L63 56 L37 56 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('BACK_UPPER')} 
                  stroke={selectedMuscle === 'BACK_UPPER' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'BACK_UPPER' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('BACK_UPPER')} 
                />

                {/* Back - Lats */}
                <path d="M37 57 Q50 55 63 57 L60 88 Q50 82 40 88 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('BACK_LAT')} 
                  stroke={selectedMuscle === 'BACK_LAT' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'BACK_LAT' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('BACK_LAT')} 
                />

                {/* Lower Back */}
                <path d="M40 89 Q50 83 60 89 L57 105 L43 105 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('BACK_LOWER')} 
                  stroke={selectedMuscle === 'BACK_LOWER' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'BACK_LOWER' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('BACK_LOWER')} 
                />

                {/* Shoulders - Rear Delt */}
                <path d="M29 38 C25 41 24 46 27 49 C28 45 30 42 32 40 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_REAR')} 
                  stroke={selectedMuscle === 'SHOULDERS_REAR' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_REAR' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_REAR')} 
                />
                <path d="M71 38 C75 41 76 46 73 49 C72 45 70 42 68 40 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('SHOULDERS_REAR')} 
                  stroke={selectedMuscle === 'SHOULDERS_REAR' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'SHOULDERS_REAR' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('SHOULDERS_REAR')} 
                />

                {/* Arms - Triceps */}
                <path d="M24 50 C21 58 23 68 25 68 C26 63 26 58 26 50 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_TRICEPS')} 
                  stroke={selectedMuscle === 'ARMS_TRICEPS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_TRICEPS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_TRICEPS')} 
                />
                <path d="M76 50 C79 58 77 68 75 68 C74 63 74 58 74 50 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('ARMS_TRICEPS')} 
                  stroke={selectedMuscle === 'ARMS_TRICEPS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'ARMS_TRICEPS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('ARMS_TRICEPS')} 
                />

                {/* Legs - Glutes */}
                <path d="M34 106 Q50 115 66 106 L68 124 Q50 132 32 124 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_GLUTES')} 
                  stroke={selectedMuscle === 'LEGS_GLUTES' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_GLUTES' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_GLUTES')} 
                />

                {/* Legs - Hamstrings */}
                <path d="M33 126 L48 130 L45 160 L33 156 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_HAMSTRINGS')} 
                  stroke={selectedMuscle === 'LEGS_HAMSTRINGS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_HAMSTRINGS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_HAMSTRINGS')} 
                />
                <path d="M67 126 L52 130 L55 160 L67 156 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_HAMSTRINGS')} 
                  stroke={selectedMuscle === 'LEGS_HAMSTRINGS' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_HAMSTRINGS' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_HAMSTRINGS')} 
                />

                {/* Legs - Calves */}
                <path d="M33 160 L43 162 L40 196 L35 196 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_CALVES')} 
                  stroke={selectedMuscle === 'LEGS_CALVES' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_CALVES' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_CALVES')} 
                />
                <path d="M67 160 L57 162 L60 196 L65 196 Z" 
                  fill="url(#goldGradient)" fillOpacity={getMuscleOpacity('LEGS_CALVES')} 
                  stroke={selectedMuscle === 'LEGS_CALVES' ? 'var(--gold-primary)' : 'rgba(0,0,0,0.25)'} strokeWidth={selectedMuscle === 'LEGS_CALVES' ? 1.5 : 0.8}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMuscle('LEGS_CALVES')} 
                />
              </svg>
            </div>
            
          </div>
        </div>

        {/* Row 2: Pure KG Evolution Trend Chart */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp style={{ color: 'var(--gold-primary)' }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>
                  Evolution Trend
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>
                  Current region: <strong>{MUSCLE_DETAILS[selectedMuscle]?.label || selectedMuscle}</strong>
                </span>
              </div>
            </div>
            
            {/* Manual Muscle Dropdown Filter */}
            <select
              className="equipment-search"
              style={{ width: 'auto', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)', padding: '6px 12px' }}
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
            >
              {Object.entries(MUSCLE_DETAILS).map(([key, details]) => (
                <option key={key} value={key}>{details.label}</option>
              ))}
            </select>
          </div>

          {logs.length === 0 ? (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted-dark)', gap: '8px' }}>
              <ShieldAlert size={40} style={{ color: 'var(--gold-primary)' }} />
              <p>No workout records found. Go to the floor plan and click on an equipment to log a session!</p>
            </div>
          ) : progressData.length < 2 ? (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted-dark)', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontWeight: 500, marginBottom: '6px' }}>Gathering data...</p>
              <p style={{ fontSize: '13px' }}>
                This muscle group ({MUSCLE_DETAILS[selectedMuscle]?.label}) needs at least <strong>2 workout logs</strong> on different days to render a trend chart.
              </p>
            </div>
          ) : (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="dateStr" stroke="var(--text-muted-dark)" fontSize={12} tickLine={false} />
                  
                  {/* Left Y-axis for Max Weight / Distance */}
                  <YAxis
                    yAxisId="left"
                    stroke="var(--gold-primary)"
                    fontSize={12}
                    tickLine={false}
                    label={{
                      value: selectedMuscle === 'CARDIO' ? 'Max Distance (km)' : 'Max Weight (kg)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'var(--gold-primary)', fontSize: 11 }
                    }}
                  />
                  
                  {/* Right Y-axis for Total Load / Duration */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--text-muted-dark)"
                    fontSize={12}
                    tickLine={false}
                    label={{
                      value: selectedMuscle === 'CARDIO' ? 'Total Duration (mins)' : 'Total Load (kg)',
                      angle: 90,
                      position: 'insideRight',
                      style: { textAnchor: 'middle', fill: 'var(--text-muted-dark)', fontSize: 11 }
                    }}
                  />
                  
                  <Tooltip content={renderLineChartTooltip} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  
                  <Line
                    yAxisId="left"
                    name={selectedMuscle === 'CARDIO' ? 'Max Distance' : 'Max Weight'}
                    type="monotone"
                    dataKey="maxWeight"
                    stroke="var(--gold-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--gold-primary)', strokeWidth: 1, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    name={selectedMuscle === 'CARDIO' ? 'Total Duration' : 'Total Load'}
                    type="monotone"
                    dataKey="totalLoad"
                    stroke="var(--text-muted-dark)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: 'var(--text-muted-dark)', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Global Workout History Table */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar style={{ color: 'var(--gold-primary)' }} size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>Workout History</h3>
            </div>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="equipment-search"
                style={{ width: '160px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                placeholder="Search equipment..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              <select
                className="equipment-search"
                style={{ width: '130px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={historyMuscleFilter}
                onChange={(e) => setHistoryMuscleFilter(e.target.value)}
              >
                <option value="ALL">All Muscles</option>
                {Object.entries(MUSCLE_DETAILS).map(([key, details]) => (
                  <option key={key} value={key}>{details.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredHistoryLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted-dark)', textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
              No matching workout logs found.
            </p>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '320px', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(204, 163, 83, 0.05)', borderBottom: '1px solid var(--border-gold)', color: 'var(--text-dark)', fontWeight: 600 }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Equipment</th>
                    <th style={{ padding: '10px 12px' }}>Muscle</th>
                    <th style={{ padding: '10px 12px' }}>Sets Detail</th>
                    <th style={{ padding: '10px 12px' }}>Notes</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryLogs.slice(0, visibleLogsCount).map((log) => {
                    const d = new Date(log.loggedAt);
                    const formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    const isCardio = log.equipment?.muscleGroup === 'CARDIO';

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-dark)' }}>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted-dark)' }}>{formattedDate}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.equipment?.customName}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', backgroundColor: 'rgba(204,163,83,0.1)', color: 'var(--gold-dark)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                            {MUSCLE_DETAILS[log.equipment?.muscleGroup || 'ANY']?.label.split(' (')[0]}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {log.sets.map((s) => {
                              let details = '';
                              if (isCardio) {
                                const parts = [];
                                if (s.heartRate !== null && s.heartRate !== undefined) parts.push(`HR: ${s.heartRate} BPM`);
                                if (s.incline !== null && s.incline !== undefined) parts.push(`Incline: ${s.incline}%`);
                                if (s.resistance !== null && s.resistance !== undefined) parts.push(`Resistance: Lvl ${s.resistance}`);
                                details = parts.length > 0 ? ` (${parts.join(', ')})` : '';
                              } else {
                                details = s.rpe ? ` (RPE ${s.rpe})` : '';
                              }
                              return (
                                <span key={s.id || s.setNumber} style={{ fontSize: '11px', color: 'var(--text-dark)', backgroundColor: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: '4px' }}>
                                  #{s.setNumber}: {isCardio ? `${s.weight}km` : `${s.weight}kg`} × {isCardio ? `${s.reps}m` : `${s.reps}r`}{details}
                                </span>
                              );
                            })}
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
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {onDeleteLog && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete this workout log? This cannot be undone.')) {
                                    onDeleteLog(log.id);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}
                                title="Delete"
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
          {filteredHistoryLogs.length > visibleLogsCount && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setVisibleLogsCount((prev) => prev + 15)}
                className="btn-gold"
                style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Monthly AI Analysis Card */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp style={{ color: 'var(--gold-primary)' }} size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>Monthly AI Analysis</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                className="equipment-search"
                style={{ width: '120px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              >
                <option value="all-time">All-time History</option>
                {availableMonths.map((m) => {
                  const [y, mm] = m.split('-');
                  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  return <option key={m} value={m}>{`${monthNames[parseInt(mm) - 1]} ${y}`}</option>;
                })}
              </select>
              <select
                aria-label="Select AI Model"
                className="equipment-search"
                style={{ width: '150px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced)</option>
                <option value="gemini-flash-latest">Gemini 3.5 Flash (Preview)</option>
                <option value="gemini-pro-latest">Gemini 3.1 Pro (Preview)</option>
              </select>
              <button
                className="btn-gold"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={handleGenerateMonthlyReport}
                disabled={isGenerating}
              >
                {isGenerating ? 'Analyzing...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
              <Activity className="animate-spin" style={{ color: 'var(--gold-primary)' }} size={32} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>AI Coach is compiling data and analyzing your training patterns...</p>
            </div>
          ) : reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Monthly Stats Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', backgroundColor: 'rgba(204,163,83,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-gold)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', textTransform: 'uppercase' }}>Training Days</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold-primary)', marginTop: '4px' }}>{reportData.stats.totalDays} days</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', textTransform: 'uppercase' }}>Total Sets</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold-primary)', marginTop: '4px' }}>{reportData.stats.totalSets} sets</div>
                </div>
              </div>

              {/* Muscle Distribution Progress */}
              {Object.keys(reportData.stats.muscleDistribution).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>Muscle Distribution:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(reportData.stats.muscleDistribution).map(([muscle, setsCount]) => {
                      const percentage = reportData.stats.totalSets > 0 ? (setsCount / reportData.stats.totalSets) * 100 : 0;
                      return (
                        <div key={muscle} style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted-dark)', marginBottom: '2px' }}>
                            <span>{MUSCLE_DETAILS[muscle]?.label.split(' (')[0] || muscle}</span>
                            <span>{setsCount} sets ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--gold-primary)', borderRadius: '3px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Coach Feedback */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: 'var(--text-dark)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {reportData.coachFeedback}
              </div>

              {/* Coach Badge Indicator */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                <span 
                  style={{ fontSize: '11px', backgroundColor: reportData.isRealAI ? 'rgba(168,85,247,0.1)' : 'rgba(0,0,0,0.05)', color: reportData.isRealAI ? 'var(--gold-primary)' : 'var(--text-muted-dark)', padding: '3px 8px', borderRadius: '20px', fontWeight: 500 }}
                  title={!reportData.isRealAI ? "Add GEMINI_API_KEY to your backend .env file to unlock the real AI coach for in-depth advice!" : "Report generated by Google Gemini AI"}
                >
                  {reportData.isRealAI ? 'Gemini AI Coach' : 'Local Coach (hover for AI unlock info)'}
                </span>
              </div>

              {/* Chatbox Section */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>Chat with AI Coach</h4>
                  {chatHistory.length > 0 && (
                    <button 
                      onClick={handleClearChat}
                      style={{ fontSize: '11px', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}
                    >
                      Clear Chat
                    </button>
                  )}
                </div>

                {/* Messages Box */}
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                  {chatHistory.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted-dark)', textAlign: 'center', margin: '20px 0' }}>
                      Have questions about this report? Ask the AI Coach below!
                    </p>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '80%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          backgroundColor: msg.role === 'user' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-gold)',
                          color: msg.role === 'user' ? '#000000' : 'var(--text-light)'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isWaitingForChat && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '8px 12px', fontSize: '12px', borderRadius: '12px 12px 12px 2px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-gold)', color: 'var(--text-muted-dark)' }}>
                        AI Coach is thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Is my back volume too high? How to balance?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isWaitingForChat}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)', borderRadius: '4px' }}
                  />
                  <button
                    type="submit"
                    className="btn-gold"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={isWaitingForChat || !chatInput.trim()}
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted-dark)', textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
              Select a month and click "Generate Report" to start your AI training analysis.
            </p>
          )}
        </div>
      </section>

      {/* Right panel - Activity & PRs */}
      <aside className="sidebar-right">
        
        {/* Daily sets (Bar Chart) */}
        <div className="analytics-card" style={{ marginBottom: '16px' }}>
          <div className="analytics-card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} />
              Recent Activity (Total Sets / Day)
            </div>
          </div>
          {logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted-light)', textAlign: 'center', padding: '30px 0', fontSize: '13px' }}>No activity data available</p>
          ) : (
            <div style={{ height: '160px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" stroke="var(--text-muted-light)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted-light)" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-panel-light)', border: '1px solid var(--border-dark)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--text-light)' }}
                    itemStyle={{ color: 'var(--gold-light)' }}
                  />
                  <Bar name="Completed Sets" dataKey="setsCount" fill="var(--gold-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* PRs */}
        <div className="analytics-card" style={{ flex: 1, marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
          <div className="analytics-card-title" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} />
              Personal Records (PR)
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {personalRecords.length === 0 ? (
              <p style={{ color: 'var(--text-muted-light)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                No personal records logged yet. Start training to see your PRs!
              </p>
            ) : (
              personalRecords.map((pr, idx) => {
                const isCardio = pr.muscleGroup === 'CARDIO';
                return (
                  <div
                    key={`pr-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '10px',
                      transition: 'border-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--gold-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-dark)'}
                  >
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-light)' }}>{pr.name}</h4>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted-light)', display: 'block', marginTop: '2px' }}>
                        Muscle: {MUSCLE_DETAILS[pr.muscleGroup]?.label || pr.muscleGroup} | Date: {pr.date}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold-primary)' }}>
                        {pr.weight} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted-light)' }}>{isCardio ? 'km' : 'kg'}</span>
                      </div>
                      <ArrowRight size={10} style={{ color: 'var(--text-muted-light)' }} />
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500 }}>
                        {pr.reps} {isCardio ? 'mins' : 'reps'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AnalyticsCharts;

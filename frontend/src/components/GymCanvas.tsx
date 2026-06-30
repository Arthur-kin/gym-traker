import React, { useState, useMemo } from 'react';
import { RotateCw, Trash2, Edit2, Dumbbell, Compass, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { GymLayout, PlacedEquipment, WorkoutLog } from '../App';

interface GymCanvasProps {
  layout: GymLayout;
  logs?: WorkoutLog[];
  onChangeLayout: (newLayout: GymLayout) => void;
  onSelectEquipment: (eq: PlacedEquipment) => void;
}

// Minimalist, premium Gold Icons matching the mockup
// Realistic Gold Equipment Icons with human stick figures for maximum visual clarity
export const GoldIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 32 }) => {
  const s = `url(#gold-gradient)`;
  const sw = "2.2";
  const props = { viewBox: "0 0 64 64", width: size, height: size, stroke: s, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  switch (type) {
    // Power Rack / Cage
    case 'POWER_RACK':
    case 'A965':
    case 'A966':
    case 'A983':
    case 'A994':
      return (
        <svg {...props}>
          {/* Main rack frame posts */}
          <rect x="14" y="10" width="36" height="46" rx="2" strokeWidth="3" />
          {/* Pull up bar/cross support */}
          <line x1="14" y1="18" x2="50" y2="18" strokeWidth="2" />
          {/* Safety spotter arms */}
          <line x1="14" y1="40" x2="50" y2="40" strokeWidth="2.5" />
          {/* Barbell across */}
          <line x1="6" y1="28" x2="58" y2="28" strokeWidth="3.5" />
          <rect x="6" y="20" width="8" height="16" rx="1" fill={s} stroke="none" />
          <rect x="50" y="20" width="8" height="16" rx="1" fill={s} stroke="none" />
        </svg>
      );

    // Bench / Crunch Station
    case 'BENCH_PRESS':
    case 'A991':
    case 'A992':
    case 'A993':
    case 'A995':
      return (
        <svg {...props}>
          {/* Bench pad */}
          <rect x="10" y="38" width="44" height="6" rx="1" fill={s} stroke="none" />
          <line x1="18" y1="44" x2="18" y2="56" strokeWidth="2.5" />
          <line x1="46" y1="44" x2="46" y2="56" strokeWidth="2.5" />
          {/* Dual rack uprights */}
          <line x1="14" y1="18" x2="14" y2="38" strokeWidth="2.5" />
          <line x1="50" y1="18" x2="50" y2="38" strokeWidth="2.5" />
          {/* Barbell across */}
          <line x1="6" y1="18" x2="58" y2="18" strokeWidth="3.5" />
          <rect x="6" y="12" width="6" height="12" rx="1" fill={s} stroke="none" />
          <rect x="52" y="12" width="6" height="12" rx="1" fill={s} stroke="none" />
        </svg>
      );

    // Dumbbells
    case 'DUMBBELLS':
    case 'A901':
      return (
        <svg {...props}>
          {/* Top Dumbbell */}
          <g>
            <line x1="14" y1="22" x2="50" y2="22" strokeWidth="4.5" />
            <rect x="16" y="13" width="8" height="18" rx="2" fill={s} stroke="none" />
            <rect x="40" y="13" width="8" height="18" rx="2" fill={s} stroke="none" />
          </g>
          {/* Bottom Dumbbell */}
          <g>
            <line x1="14" y1="42" x2="50" y2="42" strokeWidth="4.5" />
            <rect x="16" y="33" width="8" height="18" rx="2" fill={s} stroke="none" />
            <rect x="40" y="33" width="8" height="18" rx="2" fill={s} stroke="none" />
          </g>
        </svg>
      );

    // Treadmill
    case 'TREADMILL':
    case 'T665':
    case 'C545R':
    case 'C545U':
    case 'S715':
    case 'E845S':
      return (
        <svg {...props}>
          {/* Treadmill Frame */}
          <path d="M6 48h38l8-8" strokeWidth="4.5" />
          <line x1="44" y1="40" x2="44" y2="16" strokeWidth="3" />
          <rect x="38" y="10" width="12" height="6" rx="1" fill={s} stroke="none" />
          <line x1="44" y1="22" x2="32" y2="22" strokeWidth="2.5" />
          
          {/* Person Running */}
          {/* Head */}
          <circle cx="26" cy="18" r="3.5" fill={s} stroke="none" />
          {/* Torso */}
          <path d="M26 21.5l3 11" strokeWidth="2.5" />
          {/* Legs in running stride */}
          <path d="M29 32.5l5 7l-3 8" strokeWidth="2.5" />
          <path d="M29 32.5l-6 5l5 9.5" strokeWidth="2.5" />
          {/* Arms in running motion */}
          <path d="M27 24.5l6 3l-2 6" strokeWidth="2" />
        </svg>
      );

    // Cable Crossover / Functional Trainers
    case 'CABLE_MACHINE':
    case 'N971':
    case 'DS972':
      return (
        <svg {...props}>
          {/* Machine Outer Frame */}
          <rect x="14" y="8" width="36" height="48" rx="2" strokeWidth="2.5" />
          <rect x="22" y="16" width="6" height="28" rx="1" fill={s} stroke="none" opacity="0.3" />
          <rect x="36" y="16" width="6" height="28" rx="1" fill={s} stroke="none" opacity="0.3" />
          
          {/* Person Standing in Center */}
          {/* Head */}
          <circle cx="32" cy="22" r="3.5" fill={s} stroke="none" />
          {/* Torso */}
          <line x1="32" y1="25.5" x2="32" y2="40" strokeWidth="2.5" />
          {/* Legs standing */}
          <path d="M32 40l-4 16 M32 40l4 16" strokeWidth="2.5" />
          {/* Arms reaching out to cables */}
          <path d="M32 28l-10 6 M32 28l10 6" strokeWidth="2.5" />
          
          {/* Cable wires (dashed) */}
          <line x1="14" y1="12" x2="22" y2="34" strokeWidth="1.5" strokeDasharray="3 1" />
          <line x1="50" y1="12" x2="42" y2="34" strokeWidth="1.5" strokeDasharray="3 1" />
        </svg>
      );

    // Lat Pulldowns
    case 'LAT_PULLDOWN':
    case 'N916':
    case 'N926':
    case 'A986':
      return (
        <svg {...props}>
          {/* Machine Frame */}
          <path d="M34 56V10h14v14" strokeWidth="3" />
          {/* Seat */}
          <rect x="14" y="42" width="16" height="4" rx="1" fill={s} stroke="none" />
          <line x1="20" y1="46" x2="20" y2="56" strokeWidth="2.5" />
          {/* Knee Pad */}
          <circle cx="28" cy="38" r="2.5" fill={s} stroke="none" />
          <line x1="28" y1="38" x2="28" y2="42" strokeWidth="2" />
          
          {/* Lat Bar */}
          <line x1="16" y1="22" x2="40" y2="22" strokeWidth="3.2" />
          <line x1="38" y1="10" x2="38" y2="22" strokeWidth="1.2" strokeDasharray="3 1" />
          
          {/* Person Sitting */}
          {/* Head */}
          <circle cx="22" cy="28" r="3.5" fill={s} stroke="none" />
          {/* Torso leaning back slightly */}
          <path d="M22 31.5l2 10.5" strokeWidth="2.5" />
          {/* Thigh & Shin */}
          <path d="M24 42h5v14" strokeWidth="2.5" />
          {/* Arms reaching up to hold bar */}
          <path d="M23.5 33l5-11 M23.5 33l11-11" strokeWidth="2" />
        </svg>
      );

    // Row / Mid Row
    case 'ROW_MACHINE':
    case 'N918':
    case 'A988':
      return (
        <svg {...props}>
          {/* Row Machine Frame */}
          <line x1="6" y1="46" x2="52" y2="46" strokeWidth="4.5" />
          <circle cx="50" cy="36" r="8" fill={s} stroke="none" />
          <line x1="12" y1="46" x2="12" y2="54" strokeWidth="2" />
          <line x1="44" y1="46" x2="44" y2="54" strokeWidth="2" />
          
          {/* Person Rowing */}
          {/* Head */}
          <circle cx="20" cy="22" r="3.5" fill={s} stroke="none" />
          {/* Torso leaning back */}
          <path d="M20 25.5l-4 12" strokeWidth="2.5" />
          {/* Thigh & Shin */}
          <path d="M16 37.5l14-3l-4 11.5" strokeWidth="2.5" />
          {/* Seat slider (under hips) */}
          <rect x="12" y="38" width="8" height="4" rx="1" fill={s} stroke="none" />
          {/* Arms pulling cable */}
          <path d="M17.5 28.5l14 4.5" strokeWidth="2" />
          
          {/* Cable from flywheel to hands */}
          <line x1="31.5" y1="33" x2="44" y2="34" strokeWidth="1.2" strokeDasharray="3 1" />
        </svg>
      );

    // Kettlebell
    case 'KETTLEBELLS':
      return (
        <svg {...props}>
          {/* Solid bell ball */}
          <circle cx="32" cy="40" r="16" fill={s} stroke="none" />
          {/* Arched handle */}
          <path d="M20 28c0-12 24-12 24 0" strokeWidth="4.5" />
          {/* Base support line */}
          <line x1="20" y1="53" x2="44" y2="53" strokeWidth="3.2" />
        </svg>
      );

    default:
      // High-quality generic selectorized strength machine outline fallback
      if (type.startsWith('N') || type.startsWith('A') || type.startsWith('DF') || type.startsWith('DS')) {
        return (
          <svg {...props}>
            {/* Seat & backrest */}
            <path d="M18 46h16 M24 46V22h-6" strokeWidth="2.5" />
            {/* Weight stack guide tower */}
            <rect x="38" y="14" width="14" height="38" rx="1.5" strokeWidth="2" fill={s} fillOpacity="0.1" />
            <line x1="38" y1="24" x2="52" y2="24" strokeWidth="1.5" />
            <line x1="38" y1="31" x2="52" y2="31" strokeWidth="1.5" />
            <line x1="38" y1="38" x2="52" y2="38" strokeWidth="1.5" />
            <line x1="38" y1="45" x2="52" y2="45" strokeWidth="1.5" />
          </svg>
        );
      }
      return (
        <svg {...props}>
          <circle cx="32" cy="32" r="20" />
          <line x1="22" y1="32" x2="42" y2="32" strokeWidth="2" />
        </svg>
      );
  }
};

export interface EquipmentTemplate {
  type: string;
  customName: string;
  muscleGroup: string;
  category: 'free_weight' | 'machine' | 'cardio';
  imageUrl?: string;
}

// Preset library options containing SportsArt models that render via custom gold outline vector SVGs
const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  // Free Weights (A901 - A995)
  { type: 'A901', customName: 'SportsArt A901 Dumbbell Rack', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/A901-copy-375x400.png' },
  { type: 'A965', customName: 'SportsArt A965 Squat Rack', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/A965photoshop-copy-375x400.png' },
  { type: 'A966', customName: 'SportsArt A966 Power Cage', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/A966photoshop-copy-375x400.png' },
  { type: 'A991', customName: 'SportsArt A991 Adjustable Bench', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A991-Adjustable-Bench-1000x667_300-375x400.png' },
  { type: 'A992', customName: 'SportsArt A992 Flat Bench', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A992-Flat-Bench-1000x667_300-375x400.png' },
  { type: 'A993', customName: 'SportsArt A993 Back Hyperextension', muscleGroup: 'BACK_LOWER', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A993-Back-Hyperextension-1000x667_300-375x400.png' },
  { type: 'A994', customName: 'SportsArt A994 VKR Chin Dip Station', muscleGroup: 'ANY', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A994-Leg-Raise_Chin-Up-Dip-1000x667_300-375x400.png' },
  { type: 'A995', customName: 'SportsArt A995 Crunch Bench', muscleGroup: 'CORE_ABS', category: 'free_weight', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A995-Crunch-Bench-1000x667_300-375x400.png' },

  // Selectorized Strength Machines (N-Series)
  { type: 'N911', customName: 'SportsArt N911 Assisted Chin/Dip', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N911-Assisted-Chin-Dip-1000x667_300-375x400.png' },
  { type: 'N912', customName: 'SportsArt N912 Bicep Curl', muscleGroup: 'ARMS_BICEPS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N912-Bicep-Curl-1000x667_300-375x400.png' },
  { type: 'N915', customName: 'SportsArt N915 Chest Press', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N915-Independent-Chest-Press-1000x667_300-375x400.png' },
  { type: 'N916', customName: 'SportsArt N916 Lat Pulldown', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N916-Independent-Lat-Pulldown-1000x667_300-375x400.png' },
  { type: 'N917', customName: 'SportsArt N917 Shoulder Press', muscleGroup: 'SHOULDERS_FRONT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N917-Independent-Shoulder-Press-1000x667_300-375x400.png' },
  { type: 'N918', customName: 'SportsArt N918 Low Row', muscleGroup: 'BACK_UPPER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N918-Low-Row-1000x667_300-375x400.png' },
  { type: 'N919', customName: 'SportsArt N919 Lateral Raise', muscleGroup: 'SHOULDERS_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N919-Independent-Lateral-Raise-1000x667_300-375x400.png' },
  { type: 'N922', customName: 'SportsArt N922 Pec Fly/Rear Delt', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N922-Independent-Pec-Fly_Rear-Delt-1000x667_300-375x400.png' },
  { type: 'N925', customName: 'SportsArt N925 Tricep Extension', muscleGroup: 'ARMS_TRICEPS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N925-Tricep-Extension-1000x676_300-375x400.png' },
  { type: 'N926', customName: 'SportsArt N926 Lat Pulldown', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2020/03/N926-1-375x400.png' },
  { type: 'N931', customName: 'SportsArt N931 Ab Crunch', muscleGroup: 'CORE_ABS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N931-Abdominal-Crunch-1000x667_300-375x400.png' },
  { type: 'N932', customName: 'SportsArt N932 Back Extension', muscleGroup: 'BACK_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N932-Back-Extension-1000x667_300-375x400.png' },
  { type: 'N933', customName: 'SportsArt N933 Pec Deck', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2020/03/N933-375x400.png' },
  { type: 'N935', customName: 'SportsArt N935 Rotary Torso', muscleGroup: 'CORE_OBLIQUE', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N935-Rotary-Torso-1000x667_300-375x400.png' },
  { type: 'N951', customName: 'SportsArt N951 Hip Abduction', muscleGroup: 'LEGS_GLUTES', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N951-Abduction-1000x667_300-375x400.png' },
  { type: 'N952', customName: 'SportsArt N952 Hip Adduction', muscleGroup: 'ANY', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N952-Adduction-1000x667_300-375x400.png' },
  { type: 'N956', customName: 'SportsArt N956 Leg Press', muscleGroup: 'LEGS_QUADS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N956-Horizontal-Leg-Press-1000x674_300-375x400.png' },
  { type: 'N957', customName: 'SportsArt N957 Leg Extension', muscleGroup: 'LEGS_QUADS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N957-Leg-Extension-1000x667_300-375x400.png' },
  { type: 'N958', customName: 'SportsArt N958 Leg Curl', muscleGroup: 'LEGS_HAMSTRINGS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2020/03/N958-375x400.png' },
  { type: 'N961', customName: 'SportsArt N961 Total Hip', muscleGroup: 'LEGS_GLUTES', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2020/03/N961photoshop-375x400.png' },
  { type: 'N971', customName: 'SportsArt N971 Cable Crossover', muscleGroup: 'ANY', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N971-Cable-Crossover-1000x667_300-375x400.png' },
  { type: 'DS972', customName: 'SportsArt DS972 Cable Trainer', muscleGroup: 'ANY', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/DS972-1-375x400.png' },

  // Plate-Loaded Strength Machines (A-Series)
  { type: 'A975', customName: 'SportsArt A975 Rear Kick', muscleGroup: 'LEGS_GLUTES', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A975-Rear-Kick-1000x667_300-375x400.png' },
  { type: 'A981', customName: 'SportsArt A981 Seated Calf Raise', muscleGroup: 'LEGS_CALVES', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/07/A981-375x400.png' },
  { type: 'A982', customName: 'SportsArt A982 Angled Leg Press', muscleGroup: 'LEGS_QUADS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A982-Angled-Leg-Press-1000x633_300-375x400.png' },
  { type: 'A983', customName: 'SportsArt A983 Smith Machine', muscleGroup: 'ANY', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/07/A983-375x400.png' },
  { type: 'A985', customName: 'SportsArt A985 Chest Press', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/07/A985photoshop-375x400.png' },
  { type: 'A986', customName: 'SportsArt A986 Lat Pulldown', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/A986photoshop-375x400.png' },
  { type: 'A987', customName: 'SportsArt A987 Shoulder Press', muscleGroup: 'SHOULDERS_FRONT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/A987-Shoulder-Press-1000x667_300-375x400.png' },
  { type: 'A988', customName: 'SportsArt A988 Mid Row', muscleGroup: 'BACK_UPPER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_PlateLoad_A988-SeatedMidRow-1-375x400.jpg' },

  // Cardio (T-Series)
  { type: 'T665', customName: 'SportsArt T665 Treadmill', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2024/10/T665-01-web-375x400.png' },
  { type: 'C545R', customName: 'SportsArt C545R Recumbent Cycle', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/C545R9-1.jpg' },
  { type: 'C545U', customName: 'SportsArt C545U Upright Cycle', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/C545U-900Mhz-02.jpg' },
  { type: 'S715', customName: 'SportsArt S715 Stepper', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/S715-web.png' },
  { type: 'E845S', customName: 'SportsArt E845S Elliptical', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/E845S-06-1000x667_300.png' }
];

const GymCanvas: React.FC<GymCanvasProps> = ({ layout, logs, onChangeLayout, onSelectEquipment }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    free_weight: true,
    machine: true,
    cardio: true
  });
  const [cellSize, setCellSize] = useState<number>(60);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // Handle zoom-in/out with mouse scroll wheel over canvas
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setCellSize(prev => Math.min(100, prev + 2));
    } else {
      setCellSize(prev => Math.max(40, prev - 2));
    }
  };

  // Filter templates
  const filteredTemplates = EQUIPMENT_TEMPLATES.filter(t =>
    t.customName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Start dragging from library
  const handleDragStartFromLibrary = (e: React.DragEvent, template: EquipmentTemplate) => {
    e.dataTransfer.setData('source', 'library');
    e.dataTransfer.setData('type', template.type);
    e.dataTransfer.setData('customName', template.customName);
    e.dataTransfer.setData('muscleGroup', template.muscleGroup);
  };

  // Start dragging from canvas
  const handleDragStartFromCanvas = (e: React.DragEvent, eqIndex: number) => {
    e.dataTransfer.setData('source', 'canvas');
    e.dataTransfer.setData('eqIndex', eqIndex.toString());
  };

  const handleDragOverCell = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop item
  const handleDropOnCell = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source');

    if (source === 'library') {
      const type = e.dataTransfer.getData('type');
      const customName = e.dataTransfer.getData('customName');
      const muscleGroup = e.dataTransfer.getData('muscleGroup');

      const isOccupied = layout.equipment.some(eq => eq.gridX === targetX && eq.gridY === targetY);
      if (isOccupied) return;

      const newEq: PlacedEquipment = {
        type,
        customName,
        muscleGroup,
        gridX: targetX,
        gridY: targetY,
        rotation: 0
      };

      onChangeLayout({
        ...layout,
        equipment: [...layout.equipment, newEq]
      });
    } else if (source === 'canvas') {
      const eqIndex = parseInt(e.dataTransfer.getData('eqIndex'));
      if (isNaN(eqIndex)) return;

      const isOccupied = layout.equipment.some((eq, idx) => idx !== eqIndex && eq.gridX === targetX && eq.gridY === targetY);
      if (isOccupied) return;

      const updatedEquipment = [...layout.equipment];
      updatedEquipment[eqIndex] = {
        ...updatedEquipment[eqIndex],
        gridX: targetX,
        gridY: targetY
      };

      onChangeLayout({
        ...layout,
        equipment: updatedEquipment
      });
    }
  };

  // Rotate equipment
  const handleRotateNode = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedEquipment = [...layout.equipment];
    updatedEquipment[index] = {
      ...updatedEquipment[index],
      rotation: (updatedEquipment[index].rotation + 90) % 360
    };
    onChangeLayout({ ...layout, equipment: updatedEquipment });
  };

  // Rename equipment
  const handleRenameNode = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const eq = layout.equipment[index];
    const newName = prompt(`Rename "${eq.customName}" to:`, eq.customName);
    if (newName !== null && newName.trim() !== '') {
      const updatedEquipment = [...layout.equipment];
      updatedEquipment[index] = {
        ...updatedEquipment[index],
        customName: newName.trim()
      };
      onChangeLayout({ ...layout, equipment: updatedEquipment });
    }
  };

  // Remove equipment
  const handleDeleteNode = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this equipment? This will also delete all of its historical workout logs.')) {
      const updatedEquipment = layout.equipment.filter((_, idx) => idx !== index);
      onChangeLayout({ ...layout, equipment: updatedEquipment });
      setSelectedNodeId(null);
    }
  };

  return (
    <>
      {/* Left Sidebar - Collapsible Equipment Library */}
      <div className="sidebar-left-wrapper" style={{ position: 'relative', display: 'flex', height: '100%', zIndex: 10, flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', width: isSidebarCollapsed ? '0px' : '280px' }}>
        <aside 
          className="sidebar-left"
          style={{
            width: isSidebarCollapsed ? '0px' : '280px',
            minWidth: isSidebarCollapsed ? '0px' : '280px',
            borderRight: isSidebarCollapsed ? 'none' : '1px solid var(--border-dark)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
            overflowY: 'auto'
          }}
        >
          <div style={{ opacity: isSidebarCollapsed ? 0 : 1, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', height: '100%', width: '280px', flexShrink: 0 }}>
            <h3 className="sidebar-title">Equipment Library</h3>
            <div className="equipment-search-container">
              <input
                type="text"
                className="equipment-search"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

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
                background: 'var(--accent-glow)',
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
              <span>Free Weights</span>
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
                  <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>No matching equipment</div>
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
                background: 'var(--accent-glow)',
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
              <span>Strength Machines</span>
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
                  <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>No matching equipment</div>
                )}
              </div>
            )}
          </div>

          {/* 3. Cardio & Other */}
          {EQUIPMENT_TEMPLATES.some(t => t.category === 'cardio') && (
            <div>
              <div 
                onClick={() => setExpandedCategories(prev => ({ ...prev, cardio: !prev.cardio }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: 'var(--accent-glow)',
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
                <span>Cardio & Other</span>
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
                    <div style={{ color: 'var(--text-muted-dark)', fontSize: '11px', gridColumn: 'span 2', textAlign: 'center', padding: '8px' }}>No matching equipment</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

            {/* User Guide */}
            <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-dark)', fontSize: '13px', color: 'var(--text-muted-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontWeight: 600 }}>
                <Compass size={16} />
                User Guide:
              </div>
              <p>1. **Drag and drop** items from the library onto the grid floor plan.</p>
              <p>2. Select items on the grid to **rotate**, **rename**, or **remove** them.</p>
              <p>3. **Double-click** (or click log button) any item to open the **workout logger**.</p>
            </div>
          </div>
        </aside>

        {/* Collapsible toggle tab button */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{
            position: 'absolute',
            top: '24px',
            left: isSidebarCollapsed ? '0px' : '268px',
            width: '20px',
            height: '40px',
            backgroundColor: 'var(--bg-panel-light)',
            border: '1px solid var(--border-gold)',
            borderLeft: isSidebarCollapsed ? '1px solid var(--border-gold)' : 'none',
            borderRadius: '0 8px 8px 0',
            color: 'var(--gold-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(204, 163, 83, 0.15)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 100,
            outline: 'none',
            padding: 0
          }}
          title={isSidebarCollapsed ? "Expand Equipment Library" : "Collapse Equipment Library"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Center Workspace */}
      <section className="canvas-workspace" onClick={() => setSelectedNodeId(null)}>
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
                backgroundColor: showHeatmap ? 'var(--gold-primary)' : 'var(--accent-glow)',
                color: showHeatmap ? 'var(--bg-panel)' : 'var(--gold-primary)',
                border: '1px solid var(--border-gold)',
                borderRadius: '20px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxShadow: showHeatmap ? '0 0 10px var(--accent-glow-heavy)' : 'none'
              }}
            >
              {showHeatmap ? 'Hide Usage Heatmap' : 'Show Usage Heatmap'}
            </button>
          </div>
          <div className="canvas-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Grid dimension inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--accent-border-light)', color: 'var(--text-light)' }}>
              <span>Grid Columns (W):</span>
              <input 
                type="number" 
                min="4" 
                max="30" 
                value={layout.width} 
                onChange={(e) => onChangeLayout({ ...layout, width: Math.max(4, Math.min(30, parseInt(e.target.value) || 4)) })}
                style={{ width: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', borderRadius: '4px', textAlign: 'center', fontWeight: 600, outline: 'none' }}
              />
              <span>x Rows (H):</span>
              <input 
                type="number" 
                min="4" 
                max="30" 
                value={layout.height} 
                onChange={(e) => onChangeLayout({ ...layout, height: Math.max(4, Math.min(30, parseInt(e.target.value) || 4)) })}
                style={{ width: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', borderRadius: '4px', textAlign: 'center', fontWeight: 600, outline: 'none' }}
              />
            </div>
            {/* Zoom slider control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--accent-border-light)', color: 'var(--text-light)' }}>
              <span>Zoom Size:</span>
              <input 
                type="range" 
                min="40" 
                max="100" 
                value={cellSize} 
                onChange={(e) => setCellSize(parseInt(e.target.value))}
                style={{ cursor: 'pointer', accentColor: 'var(--gold-primary)', width: '80px', height: '4px', verticalAlign: 'middle' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--gold-primary)', width: '36px', textAlign: 'right' }}>{cellSize}px</span>
            </div>
            <div style={{ color: 'var(--text-muted-dark)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={16} />
              Save Layout in top right when finished! (Use mouse wheel over grid to zoom)
            </div>
          </div>
        </div>

        {/* Grid Floor Scroll Wrapper */}
        <div className="canvas-grid-scroll-wrapper">
          <div
            className="gym-canvas-grid"
            onWheel={handleWheel}
            style={{
              gridTemplateColumns: `repeat(${layout.width}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${layout.height}, ${cellSize}px)`,
              width: `${layout.width * cellSize}px`,
              height: `${layout.height * cellSize}px`,
              margin: 'auto'
            }}
          >
            {/* Background cells */}
            {Array.from({ length: layout.height }).map((_, y) =>
              Array.from({ length: layout.width }).map((_, x) => {
                const isTopLeft = x === 0 && y === 0;
                const isTopRight = x === layout.width - 1 && y === 0;
                const isBottomLeft = x === 0 && y === layout.height - 1;
                const isBottomRight = x === layout.width - 1 && y === layout.height - 1;
                return (
                  <div
                    key={`cell-${x}-${y}`}
                    className="gym-canvas-cell"
                    onDragOver={handleDragOverCell}
                    onDrop={(e) => handleDropOnCell(e, x, y)}
                    style={{
                      borderTopLeftRadius: isTopLeft ? '15px' : undefined,
                      borderTopRightRadius: isTopRight ? '15px' : undefined,
                      borderBottomLeftRadius: isBottomLeft ? '15px' : undefined,
                      borderBottomRightRadius: isBottomRight ? '15px' : undefined,
                    }}
                  />
                );
              })
            )}

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
              borderColor: `rgba(var(--accent-rgb), ${0.4 + ratio * 0.6})`,
              borderWidth: `${1.5 + ratio * 1.5}px`,
              boxShadow: `0 0 ${8 + ratio * 20}px rgba(var(--accent-rgb), ${0.25 + ratio * 0.55})`,
              backgroundColor: `rgba(var(--accent-rgb), ${ratio * 0.08})`,
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
                  ...heatmapStyle
                }}
                draggable
                onDragStart={(e) => handleDragStartFromCanvas(e, index)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(`${eq.gridX}-${eq.gridY}`);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSelectEquipment(eq);
                }}
              >
                {/* Keep label text in upright direction */}
                <div
                  style={{
                    transform: `rotate(-${eq.rotation}deg)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: `${cellSize * 0.43}px` }} className="node-icon-wrapper">
                    {(() => {
                      const template = EQUIPMENT_TEMPLATES.find(t => t.type === eq.type);
                      const iconSize = Math.max(16, Math.floor(cellSize * 0.45));
                      return template?.imageUrl ? (
                        <img src={template.imageUrl} alt={eq.customName} style={{ height: `${iconSize}px`, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(204, 163, 83, 0.3))' }} />
                      ) : (
                        <GoldIcon type={eq.type} size={iconSize} />
                      );
                    })()}
                  </div>
                  <span className="node-name" style={{ fontSize: `${Math.max(8, Math.floor(cellSize * 0.16))}px`, marginTop: `${cellSize * 0.05}px` }}>{eq.customName}</span>
                </div>

                {/* Quick actions popup */}
                {isSelected && (
                  <div
                    className="node-quick-actions"
                    style={{ transform: `translateX(-50%) rotate(-${eq.rotation}deg)` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="quick-action-btn"
                      title="Log Workout (Double-click works too)"
                      onClick={() => onSelectEquipment(eq)}
                    >
                      <Dumbbell size={14} />
                    </button>
                    <button
                      className="quick-action-btn"
                      title="Rotate 90°"
                      onClick={(e) => handleRotateNode(index, e)}
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      className="quick-action-btn"
                      title="Rename"
                      onClick={(e) => handleRenameNode(index, e)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="quick-action-btn"
                      title="Remove"
                      onClick={(e) => handleDeleteNode(index, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </section>
    </>
  );
};

export default GymCanvas;

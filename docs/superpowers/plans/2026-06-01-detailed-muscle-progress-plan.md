# Detailed Muscle Group & Pure KG Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 18 detailed muscle groups, integrate an interactive anatomical muscle activation map (Anterior/Posterior SVGs) with gold gradient shading based on recent volume, and add a progression line chart displaying pure Max Weight (kg) and Total Load (kg) upon clicking any muscle group.

**Architecture:** We will update preset templates to map to the new muscle groups, update the logger selector dropdown, rewrite the `AnalyticsCharts.tsx` component to include the inline SVG human figure with data-driven opacity/fills, and update chart calculations for weight progression.

**Tech Stack:** React, TypeScript, Recharts, SVG, Vanilla CSS

---

### Task 1: Update Preset Templates in GymCanvas

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx:201-224`

- [ ] **Step 1: Map template muscle groups to the new 18 categories**
Update `EQUIPMENT_TEMPLATES` in `frontend/src/components/GymCanvas.tsx` to map specific machines to their detailed target muscle groups:
```typescript
const EQUIPMENT_TEMPLATES = [
  // SportsArt strength machines (Dual Function)
  { type: 'DF300', customName: 'SportsArt DF300 Leg Extension/Curl', muscleGroup: 'LEGS_QUADS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-300-Leg-Extension-Curl-web-375x400.png' },
  { type: 'DF301', customName: 'SportsArt DF301 Leg Press/Calf', muscleGroup: 'LEGS_CALVES', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-301-Leg-Press-Calf-Extension-web-375x400.png' },
  { type: 'DF303', customName: 'SportsArt DF303 Lat Pull/Row', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-303-Lat-Pulldown-Mid-Row-web-375x400.png' },
  { type: 'DF304', customName: 'SportsArt DF304 Pec Fly/Delt', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-304-Pec-Fly-Rear-Deltoid-web-375x400.png' },
  { type: 'DF305', customName: 'SportsArt DF305 Bicep/Tricep', muscleGroup: 'ARMS_BICEPS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-305-Bicep-Tricep-web-375x400.png' },
  { type: 'DF308', customName: 'SportsArt DF308 Multi Press', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2022/03/DF-308-Multi-Press-web-375x400.png' },
  { type: 'DS972', customName: 'SportsArt DS972 Cable Trainer', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/DS972-1-375x400.png' },
  
  // Single function S900 Series
  { type: 'N915', customName: 'SportsArt N915 Chest Press', muscleGroup: 'CHEST_LOWER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N915-Independent-Chest-Press-1000x667_300-375x400.png' },
  { type: 'N916', customName: 'SportsArt N916 Lat Pulldown', muscleGroup: 'BACK_LAT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N916-Independent-Lat-Pulldown-1000x667_300-375x400.png' },
  { type: 'N917', customName: 'SportsArt N917 Shoulder Press', muscleGroup: 'SHOULDERS_FRONT', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N917-Independent-Shoulder-Press-1000x667_300-375x400.png' },
  { type: 'N918', customName: 'SportsArt N918 Low Row', muscleGroup: 'BACK_UPPER', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N918-Low-Row-1000x667_300-375x400.png' },
  { type: 'N957', customName: 'SportsArt N957 Leg Extension', muscleGroup: 'LEGS_QUADS', category: 'machine', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/N957-Leg-Extension-1000x667_300-375x400.png' },
  
  // Cardio & Free Weights
  { type: 'T665', customName: 'SportsArt T665 Treadmill', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2024/10/T665-01-web-375x400.png' },
  { type: 'POWER_RACK', customName: 'Power Rack', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'BENCH_PRESS', customName: 'Bench Press', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'DUMBBELLS', customName: 'Dumbbells', muscleGroup: 'ANY', category: 'free_weight' },
  { type: 'KETTLEBELLS', customName: 'Kettlebells', muscleGroup: 'ANY', category: 'free_weight' }
];
```

- [ ] **Step 2: Commit template changes**
```bash
# Verify it compiles locally
# Commit:
# git commit -m "feat(frontend): map preset equipment templates to detailed muscle groups"
```

---

### Task 2: Update Select Dropdown in WorkoutLogger

**Files:**
- Modify: `frontend/src/components/WorkoutLogger.tsx:149-160`

- [ ] **Step 1: Map all 18 muscle group categories in selector dropdown**
Update `WorkoutLogger.tsx`'s select dropdown list to contain all 18 detailed categories with clear Chinese descriptions:
```typescript
                {[
                  { value: 'ANY', label: 'ANY (自由選擇 / 複合肌群)' },
                  { value: 'CHEST_UPPER', label: '胸部 - 上胸 (Upper Chest)' },
                  { value: 'CHEST_LOWER', label: '胸部 - 中下胸 (Lower Chest)' },
                  { value: 'BACK_LAT', label: '背部 - 背闊肌 (Lats)' },
                  { value: 'BACK_UPPER', label: '背部 - 上背與斜方 (Upper Back)' },
                  { value: 'BACK_LOWER', label: '背部 - 下背豎脊肌 (Lower Back)' },
                  { value: 'SHOULDERS_FRONT', label: '肩部 - 前三角肌 (Ant Delt)' },
                  { value: 'SHOULDERS_LAT', label: '肩部 - 側三角肌 (Lat Delt)' },
                  { value: 'SHOULDERS_REAR', label: '肩部 - 後三角肌 (Post Delt)' },
                  { value: 'ARMS_BICEPS', label: '手臂 - 肱二頭肌 (Biceps)' },
                  { value: 'ARMS_TRICEPS', label: '手臂 - 肱三頭肌 (Triceps)' },
                  { value: 'ARMS_FOREARM', label: '手臂 - 前臂與肱肌 (Forearms)' },
                  { value: 'LEGS_QUADS', label: '腿部 - 股四頭肌 (Quads)' },
                  { value: 'LEGS_HAMSTRINGS', label: '腿部 - 大腿後側 (Hamstrings)' },
                  { value: 'LEGS_GLUTES', label: '腿部 - 臀肌 (Glutes)' },
                  { value: 'LEGS_CALVES', label: '腿部 - 小腿肌 (Calves)' },
                  { value: 'CORE_ABS', label: '核心 - 腹直肌 (Abs)' },
                  { value: 'CORE_OBLIQUE', label: '核心 - 側腹肌 (Obliques)' },
                  { value: 'CARDIO', label: '有氧 - 心肺訓練 (Cardio)' }
                ].map(item => (
                  <option key={item.value} value={item.value} style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-light)' }}>
                    {item.label}
                  </option>
                ))}
```

- [ ] **Step 2: Commit select selector changes**
```bash
# Verify it builds
```

---

### Task 3: Implement Anatomical Heatmap & Pure KG Progress Chart

**Files:**
- Modify: `frontend/src/components/AnalyticsCharts.tsx`

- [ ] **Step 1: Update imports and add detailed muscle groups constants**
We need to render front and back SVG diagrams. Let's add a state to track the active selected muscle group (`selectedMuscle` defaulting to `'ANY'` or first tracked muscle). Let's modify `AnalyticsCharts.tsx` to handle pure KG tracking and SVG highlighting.
```typescript
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { WorkoutLog } from '../App';
```

- [ ] **Step 2: Add SVG Path Data and rendering functions**
Implement the front and back body outline inside `AnalyticsCharts.tsx` using responsive path vectors. Render each muscle group shape as an SVG path. Map the opacity of each path to the count of sets performed on that muscle group in the last 30 days. Add an `onClick` handler on each path to set `selectedMuscle` group.

- [ ] **Step 3: Update chart calculations for weight (kg) trends**
Filter logs matching `selectedMuscle` (or equipment name if selected). For each session, calculate:
1. `maxWeight`: The maximum weight (kg) lifted across all sets.
2. `totalLoad`: The total training volume (sets × reps × weight) in kg.
Plot these two series in the LineChart with golden and light grey colors.

- [ ] **Step 4: Verify the compilation and test the dashboard**
Open browser at `http://localhost:3000` (or production port). Check:
1. Muscle heat map displays.
2. Clicking a muscle group (e.g. Triceps) updates the stats and chart showing "Max Weight (kg)" and "Total Session Load (kg)" trends.
3. The Units are correctly labeled as `kg` on both the Y-axis and in tooltips.

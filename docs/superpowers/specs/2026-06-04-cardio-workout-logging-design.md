# Design Spec: Cardio Workout Logging and Analytics Dashboard

## 1. Overview
Currently, the workout logger and analytics chart display input labels and units tailored for strength training (Weight in kg/lbs, Reps, RPE 1-10). Recording cardio workouts using these labels is counter-intuitive.

This specification describes a design to dynamically adjust logging fields and analytics labels based on whether the workout equipment is categorized under `CARDIO` (muscle group is `CARDIO`). This provides a seamless, custom experience for both cardio and strength training without changing the underlying PostgreSQL/Prisma database schema.

## 2. Dynamic Field Mapping
We map the existing database fields semantically in the frontend for cardio workouts:

| Prisma Field | Strength View | Cardio View (muscleGroup = 'CARDIO') |
|---|---|---|
| `weight` (Float) | Weight (kg) | **Distance (km)** |
| `reps` (Int) | Reps | **Time (mins)** |
| `rpe` (Int) | RPE (1-10) | **Resistance Level or Heart Rate (BPM)** (no 1-10 constraint) |

## 3. UI/UX Customizations

### 3.1 Workout Logger (`WorkoutLogger.tsx`)
- **Headers**: Check if `equipment.muscleGroup === 'CARDIO'`. If true, change labels from "Weight", "Reps", "RPE" to **"Distance"**, **"Time"**, and **"Level/HR"**.
- **Inputs**:
  - Distance: Change placeholder to `"km"`
  - Time: Change placeholder to `"mins"`
  - Level/HR: Change placeholder to `"BPM/Lvl"`. If cardio, remove `min="1" max="10"` input constraints.
- **Log History Display**: For cardio entries, display sets as `{s.weight} km × {s.reps} mins` and append `(Lvl/HR: {s.rpe})` if RPE exists.

### 3.2 Analytics & Progression Charts (`AnalyticsCharts.tsx`)
- **Cardio Progression Metric**:
  - Max Weight (`maxWeight` in chart dataset) represents **Max Distance (km)**.
  - Total Load (`totalLoad` in chart dataset) represents **Total Time (mins)** (calculated as the sum of `reps` for the session instead of multiplying `weight * reps`).
- **Y-Axis Labels**: If `selectedMuscle === 'CARDIO'`, change labels to **"最高距離 (km)"** (left) and **"總運動時間 (mins)"** (right).
- **Line Chart Tooltips**: If `selectedMuscle === 'CARDIO'`, format values with `"km"` and `"mins"`.
- **Legend & Line Names**: Change line names dynamically:
  - Left Line: "最高重量 (Max Weight)" $\rightarrow$ **"最高距離 (Max Distance)"**
  - Right Line: "單次總負荷量 (Total Load)" $\rightarrow$ **"總有氧時間 (Total Duration)"**
- **Personal Records (PR) Units**: For equipment mapped to `CARDIO`, display weight as `km` and reps as `mins`.

## 4. Verification Plan
1. **Frontend Compilation**: Run `npm run build` inside `frontend` directory to ensure no typescript errors are introduced.
2. **Container Restart**: Rebuild the frontend container using `docker compose up -d --build gym-frontend`.
3. **UI Verification**:
   - Open the logger for a cardio machine (e.g. C545R Recumbent Cycle). Confirm that labels are "Distance", "Time", "Level/HR" and units/placeholders match.
   - Enter a session: e.g., 5.5 km, 35 mins, 140 BPM/Level. Save and confirm it renders in history list as `5.5 km × 35 mins (Lvl/HR: 140)`.
   - Go to Analytics, click the Cardio heatmap button. Confirm that the chart Y-axes, tooltips, legend, and personal records show appropriate cardio labels (km, mins, Level/HR) and that progression lines map distance and duration accurately.

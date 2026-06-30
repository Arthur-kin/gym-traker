# AI Coach Center: PPL Routines & Alternate Equipment Design

## Goal
Transform the existing "Goals" tab into a comprehensive "Coach" center. Integrate an AI-powered Push-Pull-Legs (PPL) weekly workout routine generator based on the user's customized gym layout, implement a dynamic exercise "Alternate" switcher for occupied equipment, and link routines directly to the Workout Logger for seamless tracking.

## Architecture
1. **Coach Center UI Dashboard**: Replace the `GoalsDashboard.tsx` tab with a split `CoachDashboard.tsx` layout. The dashboard houses both PPL Routines (Left Column) and Goals & Challenges (Right Column).
2. **AI PPL Routine Generator**: Add a backend endpoint `POST /api/goals/recommend-ppl` that inspects the placed layout equipment, takes the user's experience level, and outputs 3 workout routines:
   - **Push Day**: Targeting Chest, Shoulders, Triceps.
   - **Pull Day**: Targeting Back, Biceps.
   - **Legs Day**: Targeting Legs (Quads, Hamstrings, Glutes, Calves) and Core.
3. **Motion-based Alternate Switcher**: Next to each exercise in the routine, provide an "Alternate" button. This triggers a frontend scanner over the loaded `layout.equipment` to search for items targeting similar muscle groups and motion types, allowing an instant swap.
4. **Logger Prepulator Link**: Clicking "Start Session" triggers a sequence mode in `App.tsx` that pre-fills and opens the `WorkoutLogger` modal for each exercise in the day's routine, saving logging time.

---

## Detailed Specifications

### 1. Unified Coach Center Dashboard
Rename `frontend/src/components/GoalsDashboard.tsx` to `CoachDashboard.tsx`.
- Keep the existing goals CRUD UI in the right panel.
- Implement the PPL Routine Generator panel in the left panel.
- State properties to manage:
  - `pplPlan`: object containing push, pull, legs arrays of exercises.
  - `selectedExperience`: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'.
  - `activeRoutineDay`: 'push' | 'pull' | 'legs'.

### 2. Backend Route for PPL recommendation
Modify `/backend/src/routes/goals.ts` to add `POST /recommend-ppl` endpoint:
- Arguments: `{ experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }`
- Fetches all equipment currently in the default layout.
- Sends the equipment list and experience level to Gemini (`gemini-2.5-flash`), demanding a structured JSON response of 3 routines containing exercises mapping to placed equipment.
- Response JSON schema:
  ```json
  {
    "push": [
      { "equipmentId": "string", "name": "string", "sets": number, "reps": string, "notes": "string" }
    ],
    "pull": [...],
    "legs": [...]
  }
  ```

### 3. Frontend Alternate Logic
When the user clicks "Alternate" on an exercise with `equipmentId` and `muscleGroup`:
- Filter `layout.equipment` for items with matching muscle groups (e.g. if the original exercise targets `CHEST_UPPER`, filter for other `CHEST_UPPER` or `CHEST_LOWER` equipment).
- Display a small modal list of matching alternative equipment placed in the gym.
- Clicking a candidate swaps the `equipmentId` and title inside the `pplPlan` state for that slot.

### 4. Direct App.tsx Logging Sequence
- Introduce `activeLogQueue` state in `App.tsx` containing list of equipment to log.
- When "Start Session" is clicked for a PPL day, populate `activeLogQueue` with the day's exercise items.
- Automatically pop up `WorkoutLogger` modal for the first item. When saved or closed, automatically open the next item in the queue.

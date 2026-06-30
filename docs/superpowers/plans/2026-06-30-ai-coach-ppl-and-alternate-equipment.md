# AI Coach Center: PPL & Alternate Equipment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a full-stack AI Coach Center featuring layout-based PPL workout generators, occupied equipment alternate selectors, and a sequential log scheduler.

**Architecture:** Extend backend Gemini prompts, open endpoints in goals router, migrate GoalsDashboard to CoachDashboard, build swap modulators, and integrate queue logging sequences.

**Tech Stack:** React, Express, Prisma ORM, Google Generative AI (Gemini)

---

### Task 1: Backend PPL AI Generation & Route

**Files:**
- Modify: `/opt/gym-tracker/backend/src/services/aiService.ts`
- Modify: `/opt/gym-tracker/backend/src/routes/goals.ts`

- [ ] **Step 1: Add generatePPLPlan in aiService.ts**
  Implement `generatePPLPlan(equipmentList: any[], experienceLevel: string): Promise<any>` using Gemini (`gemini-2.5-flash` with `responseMimeType: 'application/json'`). It should map muscle groups of placed equipment to Push, Pull, Legs exercises.
  Push targets: CHEST, SHOULDERS, TRICEPS.
  Pull targets: BACK, BICEPS.
  Legs targets: LEGS (Quads, Hamstrings, Glutes, Calves), ABS.

- [ ] **Step 2: Add POST /recommend-ppl route in routes/goals.ts**
  Create a new endpoint `POST /recommend-ppl` that:
  - Fetches the active layout equipment list.
  - Calls `generatePPLPlan` from `aiService`.
  - Responds with the structured PPL plan.

- [ ] **Step 3: Compile backend code**
  Run: `npm run build` in `/opt/gym-tracker/backend`
  Expected: Builds successfully.

---

### Task 2: Rename and Refactor to CoachDashboard

**Files:**
- Rename: `/opt/gym-tracker/frontend/src/components/GoalsDashboard.tsx` ➔ `/opt/gym-tracker/frontend/src/components/CoachDashboard.tsx`
- Modify: `/opt/gym-tracker/frontend/src/App.tsx`
- Modify: `/opt/gym-tracker/frontend/src/components/CoachDashboard.tsx`

- [ ] **Step 1: Rename the component file using Git**
  Run: `git mv frontend/src/components/GoalsDashboard.tsx frontend/src/components/CoachDashboard.tsx` inside `/opt/gym-tracker`.

- [ ] **Step 2: Update App.tsx navigation and imports**
  - Update navbar button text from "Goals & Challenges" (目標與挑戰) to "AI Coach" (智慧教練).
  - Change activeTab state from `'goals'` to `'coach'`.
  - Replace `<GoalsDashboard />` import and rendering with `<CoachDashboard />`.

- [ ] **Step 3: Rebuild CoachDashboard.tsx layout**
  Update the component definition, rename CSS variables and class states to reflect Coach Center, and structure it into a 2-column layout (PPL routines on the left, existing goals on the right).

---

### Task 3: Implement Frontend Alternate Equipment Selector

**Files:**
- Modify: `/opt/gym-tracker/frontend/src/components/CoachDashboard.tsx`

- [ ] **Step 1: Build the Alternate Modal**
  Add a modal that appears when clicking "Alternate". It reads the list of equipment from `layout` (passed as a prop from `App.tsx`) matching the muscle group class of the exercise. Clicking a row swaps the exercise object inside the local `pplPlan` state.

---

### Task 4: Implement Sequential Logging Queue in App.tsx

**Files:**
- Modify: `/opt/gym-tracker/frontend/src/App.tsx`
- Modify: `/opt/gym-tracker/frontend/src/components/CoachDashboard.tsx`

- [ ] **Step 1: Introduce logQueue state in App.tsx**
  Create `logQueue` state inside `App.tsx` representing the remaining equipment to log in the current training session.
  ```typescript
  const [logQueue, setLogQueue] = useState<{ equipmentId: string; targetSets: number }[]>([]);
  ```

- [ ] **Step 2: Connect WorkoutLogger triggers to logQueue**
  In `handleAddLog` callback or `onClose` inside `App.tsx`, if `logQueue` is not empty, pop the next item, update `logQueue`, and trigger `setSelectedEquipment` for it so the logger modal automatically pops up.

- [ ] **Step 3: Connect CoachDashboard Start Workout trigger**
  Add `onStartSession` callback inside `CoachDashboard.tsx` that receives the array of exercise items, populates `logQueue` in `App.tsx`, and triggers the sequential logging.

---

### Task 5: Compile, Deploy, and Verify

**Files:**
- None (compilation & deployment)

- [ ] **Step 1: Verify frontend build**
  Run: `npm run build` in `/opt/gym-tracker/frontend`

- [ ] **Step 2: Rebuild Docker containers**
  Run: `docker compose down && docker compose up -d --build`

- [ ] **Step 3: Verify end-to-end flow**
  Verify generating a plan, swapping an occupied chest press with a flat bench press, and clicking "Start Session" correctly chains the logger modals.

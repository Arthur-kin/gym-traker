# Add Cardio Equipment Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new SportsArt cardio equipment templates (C545R, C545U, S715, E845S) to the gym tracker app's preset library with official images.

**Architecture:** Append C545R, C545U, S715, and E845S to the `EQUIPMENT_TEMPLATES` array in `frontend/src/components/GymCanvas.tsx`. Map them in `GoldIcon` component for vector icon fallback.

**Tech Stack:** React, TypeScript, Docker Compose.

---

### Task 1: Update GymCanvas.tsx Templates and Icon Mapping

**Files:**
- Modify: `frontend/src/components/GymCanvas.tsx`
- Test: Build check in frontend container

- [ ] **Step 1: Update GymCanvas.tsx**

Update `EQUIPMENT_TEMPLATES` and `GoldIcon` in `/opt/gym-tracker/frontend/src/components/GymCanvas.tsx`.

Add new case statements under the `TREADMILL` block:
```typescript
    // Treadmill
    case 'TREADMILL':
    case 'T665':
    case 'C545R':
    case 'C545U':
    case 'S715':
    case 'E845S':
      return (
        // ... treadmill SVG path rendering ...
      );
```

Add the new entries to `EQUIPMENT_TEMPLATES` under the Cardio section (around line 287):
```typescript
  // Cardio (T-Series)
  { type: 'T665', customName: 'SportsArt T665 Treadmill', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2024/10/T665-01-web-375x400.png' },
  { type: 'C545R', customName: 'SportsArt C545R Recumbent Cycle', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/C545R9-1.jpg' },
  { type: 'C545U', customName: 'SportsArt C545U Upright Cycle', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/C545U-900Mhz-02.jpg' },
  { type: 'S715', customName: 'SportsArt S715 Stepper', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2017/02/S715-web.png' },
  { type: 'E845S', customName: 'SportsArt E845S Elliptical', muscleGroup: 'CARDIO', category: 'cardio', imageUrl: 'https://www.gosportsart.com/wp-content/uploads/2025/05/E845S-06-1000x667_300.png' }
```

- [ ] **Step 2: Run compiler to verify no TypeScript compilation errors**

Run command in workspace `/opt/gym-tracker/frontend`:
`npm run build`
Expected: Successful compile without errors.

---

### Task 2: Rebuild & Restart Docker Container

**Files:**
- Modify: None
- Test: Docker Compose up check

- [ ] **Step 1: Rebuild the gym-frontend service**

Run command in workspace `/opt/gym-tracker`:
`docker compose up -d --build gym-frontend`
Expected: Container successfully built and running.

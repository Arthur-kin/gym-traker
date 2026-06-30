# Design Spec: Add Cardio Equipment Templates with Official Images

## 1. Overview
The user requested adding four new commercial cardio equipment templates to their gym layout library, matching their SportsArt inventory:
- **C545R Recumbent Cycle** (靠背式腳踏車)
- **C545U Upright Cycle** (直立式腳踏車)
- **S715** (階梯機)
- **E845S** (心肺橢圓交叉訓練機)

In addition, we need to verify that `N935` (Rotary Torso) is present in the inventory templates and correctly mapped to the side abs (`CORE_OBLIQUE`) muscle group.

All new cardio equipment templates will use their official image URLs fetched from `https://www.gosportsart.com` to display real-world previews on the layout grid.

## 2. Inventory & Media Data Mapping
The new templates to be appended to `EQUIPMENT_TEMPLATES` in `frontend/src/components/GymCanvas.tsx` are defined as follows:

| Model | Custom Name | Category | Muscle Group | Image URL |
|---|---|---|---|---|
| **C545R** | SportsArt C545R Recumbent Cycle | `cardio` | `CARDIO` | `https://www.gosportsart.com/wp-content/uploads/2017/02/C545R9-1.jpg` |
| **C545U** | SportsArt C545U Upright Cycle | `cardio` | `CARDIO` | `https://www.gosportsart.com/wp-content/uploads/2017/02/C545U-900Mhz-02.jpg` |
| **S715** | SportsArt S715 Stepper | `cardio` | `CARDIO` | `https://www.gosportsart.com/wp-content/uploads/2017/02/S715-web.png` |
| **E845S** | SportsArt E845S Elliptical | `cardio` | `CARDIO` | `https://www.gosportsart.com/wp-content/uploads/2025/05/E845S-06-1000x667_300.png` |

`N935` (SportsArt N935 Rotary Torso) is already configured as:
- **Type**: `N935`
- **Category**: `machine`
- **Muscle Group**: `CORE_OBLIQUE` (Obliques / 側腹肌)
- **Image URL**: `https://www.gosportsart.com/wp-content/uploads/2025/05/N935-Rotary-Torso-1000x667_300-375x400.png`
No changes are required for `N935` as it is already compliant.

## 3. Implementation Details

### 3.1 Update `EQUIPMENT_TEMPLATES` array
In `frontend/src/components/GymCanvas.tsx`, we will append the four new entries to the `EQUIPMENT_TEMPLATES` array in the "Cardio" section.

### 3.2 Update `GoldIcon` component
We will map `C545R`, `C545U`, `S715`, and `E845S` under the `TREADMILL` icon case group in the `GoldIcon` component. Although these items have `imageUrl` defined and will render images by default, having the vector mapping in `GoldIcon` acts as a robust fallback in case of image load failures or network issues.

## 4. Verification Plan
1. **Frontend Compilation**: Run `npm run build` inside `frontend` directory (via docker compose or directly) to ensure no typescript errors are introduced.
2. **Docker Compose Rebuild**: Run `docker compose up -d --build gym-frontend` to deploy the changes to the user's running environment.
3. **UI Verification**:
   - Open the web application and check the **Cardio & Other** category in the left sidebar library.
   - Verify that all four models are visible, named correctly, and show their corresponding official product images.
   - Drag them onto the grid canvas to verify rendering and alignment behavior.

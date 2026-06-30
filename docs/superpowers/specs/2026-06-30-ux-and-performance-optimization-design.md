# UX and Performance Optimization Design

## Goal
Implement a modern, non-blocking Toast notification system to replace native `alert()` dialogs, optimize page load speed via asynchronous non-blocking fetching, and prevent UI lag using backend-supported pagination for workout logs.

## Architecture
1. **Toast Notification System**: Create a lightweight React Toast Context (`ToastProvider` and `useToast` hook) that renders stylized notifications (Gold & Gray or Black & Purple) in the top-right corner.
2. **Non-blocking Data Fetching**: Decouple page mounting from workout logs load. Mount the layout and profile immediately to hide the loading spinner, then fetch workout logs asynchronously in the background.
3. **Workout Logs API Pagination**: Enhance `GET /api/logs` to support optional query parameters `page` and `limit`. Integrate this in the frontend's history logs table with a "Load More" action.

---

## Detailed Specifications

### 1. Toast Notification System
Create `/frontend/src/components/Toast.tsx` with:
- `ToastContext` providing `showToast(message: string, type: 'success' | 'error' | 'info')`
- Styled banner container anchored in the top-right corner (`position: fixed; top: 20px; right: 20px; z-index: 1000;`)
- CSS variable configurations to support theme-adaptive styling:
  - Background: `rgba(var(--accent-rgb), 0.1)` with `backdrop-filter: blur(10px)`
  - Border: `1px solid var(--border-gold)`
  - Text: `var(--text-dark)`
  - Box shadow: `var(--shadow-gold)`

### 2. Backend API Pagination
Enhance `GET /api/logs` in `/backend/src/server.ts` to accept `page` and `limit` parameters:
- `page`: default 1
- `limit`: default 0 (0 returns all records, ensuring backward compatibility)
- Returned payload on paginated request:
  ```json
  {
    "logs": [...],
    "pagination": {
      "page": number,
      "limit": number,
      "totalCount": number,
      "totalPages": number
    }
  }
  ```

### 3. Frontend Asynchronous Fetching & Pagination
- Modify `/frontend/src/App.tsx`:
  - `fetchData` fetches `/api/layout` and `/api/profile`, and immediately turns off `isLoading`.
  - Asynchronously fetch `/api/logs` without locking the global spinner.
  - Implement dynamic state for paginated history logs.
  - Replace all `alert(...)` references with `showToast(...)`.

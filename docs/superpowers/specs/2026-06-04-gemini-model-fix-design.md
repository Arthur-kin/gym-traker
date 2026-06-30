# Gemini API Model Fix and Selector Design Specification

This specification documents the implementation of a user-selectable Gemini model feature from the frontend UI to resolve the `404 Not Found` error and offer flexibility in model choice.

## 1. Problem Description

With the newly issued Google AI Studio API keys (prefixed with `AQ.`), requests to the legacy `gemini-1.5-flash` model endpoint return an HTTP `404 Not Found` error. 

By testing different models, we found that:
- `gemini-flash-latest` (resolving to `gemini-3.5-flash`) works successfully with the new key.
- The user prefers to be able to switch models directly from the frontend UI (e.g. to use `gemini-1.5-pro` for higher quality or `gemini-flash-latest` for speed/cost-efficiency).

## 2. Solution Architecture

We will implement a dropdown selector in the frontend UI to choose the active model, which is then passed to the backend `POST /api/logs/monthly-analysis` API endpoint.

### A. Backend API Change (`POST /api/logs/monthly-analysis`)
- **Request Body**:
  ```json
  {
    "yearMonth": "2026-06",
    "model": "gemini-flash-latest" 
  }
  ```
  - `model` is optional and defaults to `"gemini-flash-latest"` if omitted or empty.
- **Logic**:
  - Validates if `model` is one of the supported models (e.g. `gemini-flash-latest`, `gemini-2.5-flash`, `gemini-1.5-pro`).
  - Passes the selected model string to the Google Generative AI SDK client.

### B. Frontend UI Change (`AnalyticsCharts.tsx`)
- Add a dropdown menu next to the "Generate Report" button in the Monthly AI Analysis card.
- Options:
  1. `gemini-flash-latest` (預設 - 快速且經濟)
  2. `gemini-2.5-flash` (新一代 Flash - 平衡)
  3. `gemini-1.5-pro` (專業教練 - 高品質分析)
- Pass the selected model in the request body of the API call.

---

## 3. Design & Implementation Details

### Backend: [server.ts](file:///opt/gym-tracker/backend/src/server.ts)

```typescript
// Supported model whitelist
const SUPPORTED_GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-pro'
];

// Extract from req.body
const { yearMonth, model: requestedModel } = req.body;
let modelName = 'gemini-flash-latest';
if (requestedModel && SUPPORTED_GEMINI_MODELS.includes(requestedModel)) {
  modelName = requestedModel;
}

// Call AI with dynamic modelName
const model = ai.getGenerativeModel({ model: modelName });
```

### Frontend: [AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx)

- Add a dropdown select element matching the existing gold/charcoal theme styles.
- Add `selectedModel` state to the component (defaulting to `'gemini-flash-latest'`).
- Update the fetch request to pass `{ yearMonth, model: selectedModel }`.

---

## 4. Verification Plan

1. Verify backend compilation success.
2. Build and restart backend Docker container: `docker compose up -d --build gym-backend`
3. Open the Analytics tab and choose each model from the dropdown. Verify that generating the report works and the backend logs show the correct model name.

# Gemini Model Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a model selector dropdown in the Analytics tab UI allowing users to dynamically choose their preferred Gemini model (e.g. Flash vs Pro), passing it to the backend to resolve the `AQ.` API key compatibility issue.

**Architecture:** Add a new `model` field to the `POST /api/logs/monthly-analysis` API request body, validate it in the backend with a whitelist, and add a selection menu state and dropdown in the frontend component.

**Tech Stack:** React, TypeScript, Express, Google Generative AI SDK, Docker

---

### Task 1: Backend API Support for Selected Model

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Update server.ts implementation**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), modify the handler for `POST /api/logs/monthly-analysis` (around lines 255-265) to accept the model parameter and validate it against a whitelist.

Code change:
```typescript
    const SUPPORTED_GEMINI_MODELS = [
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-pro'
    ];

    const { yearMonth, model: requestedModel } = req.body;
    let modelName = 'gemini-flash-latest';
    if (requestedModel && SUPPORTED_GEMINI_MODELS.includes(requestedModel)) {
      modelName = requestedModel;
    }
```
And pass `modelName` to `getGenerativeModel`.

- [ ] **Step 2: Compile the backend locally to verify no TypeScript issues**

Run: `npm run build` inside `/opt/gym-tracker/backend`
Expected: Compile success without any type errors.

- [ ] **Step 3: Commit backend changes**

Run:
```bash
git add backend/src/server.ts
git commit -m "backend: add support for dynamic Gemini model selection with whitelist"
```

---

### Task 2: Frontend Dropdown Selector UI

**Files:**
- Modify: `frontend/src/components/AnalyticsCharts.tsx`

- [ ] **Step 1: Add state for selected model**

In [frontend/src/components/AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx), add `selectedModel` state:
```typescript
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
```

- [ ] **Step 2: Update API call payload**

Pass `selectedModel` in the fetch request body:
```typescript
      const res = await fetch('/api/logs/monthly-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth, model: selectedModel })
      });
```

- [ ] **Step 3: Render model dropdown in the UI**

Add the model selection dropdown in the Card header:
```jsx
              <select
                className="equipment-search"
                style={{ width: '150px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="gemini-flash-latest">Gemini 3.5 Flash (預設)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (高級)</option>
              </select>
```

- [ ] **Step 4: Commit frontend changes**

Run:
```bash
git add frontend/src/components/AnalyticsCharts.tsx
git commit -m "frontend: add Gemini model selection dropdown UI in Analytics"
```

---

### Task 3: Deployment and Verification

- [ ] **Step 1: Restart backend container**

Run: `docker compose up -d --build gym-backend`
Expected: Container starts successfully.

- [ ] **Step 2: Verify monthly analysis report generation**

Navigate to the frontend at `http://localhost:8085` (or the configured port), choose "Gemini 3.5 Flash" or "Gemini 1.5 Pro", and click "產生報告" (Generate Report). Verify the analysis is completed and the ✨ Gemini AI 教練 badge is displayed with correct response content.

- [ ] **Step 3: Verify backend logs**

Run: `docker compose logs gym-backend --tail=30`
Verify that no 404 error is shown and the API requests resolve successfully.

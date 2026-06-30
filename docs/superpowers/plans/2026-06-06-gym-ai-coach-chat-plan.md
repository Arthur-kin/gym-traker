# Gymformer AI Coach Chat & All-Time Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Option A (All-Time fitness data trend analysis) and Option B (collapsible stateless AI Coach chat interface using LocalStorage for persistence).

**Architecture:** Update `POST /api/logs/monthly-analysis` in the backend to support aggregating all workout logs when `yearMonth === "all-time"`, create a new `POST /api/logs/monthly-analysis/chat` stateless chat endpoint, and add the dropdown option and a chatbox component in the frontend Analytics panel.

**Tech Stack:** React, TypeScript, Express, Google Generative AI SDK, Docker

---

### Task 1: Backend All-Time Query Support & Chat API

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Implement "all-time" logs fetching and prompt adjustment**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), update the `POST /api/logs/monthly-analysis` handler. If `yearMonth === 'all-time'`, query all workout logs without date filters. Adjust the Gemini AI prompt to generate a long-term/macro trend report.

Modify the existing code around lines 220-250:
```typescript
    let logs;
    if (yearMonth === 'all-time') {
      // Fetch all workout logs across all times
      logs = await prisma.workoutLog.findMany({
        include: {
          equipment: true,
          sets: true
        }
      });
    } else {
      // Fetch specific month
      const startOfMonth = new Date(`${yearMonth}-01T00:00:00.000Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      logs = await prisma.workoutLog.findMany({
        where: {
          loggedAt: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        },
        include: {
          equipment: true,
          sets: true
        }
      });
    }
```
And adjust the AI prompt template:
```typescript
        const isAllTime = yearMonth === 'all-time';
        const prompt = isAllTime
          ? `You are a professional fitness personal trainer. Please write a long-term fitness training analysis report in Traditional Chinese (繁體中文).
             Here are the user's lifetime workout statistics:
             - Total active workout days: ${totalDays} days
             - Total completed sets: ${totalSets} sets
             - Lifetime training volume per muscle group (in sets): ${JSON.stringify(muscleDistribution)}
             
             Guidelines:
             1. Start with a warm greeting and review their total lifetime progress.
             2. Analyze their muscle balance over the long run. Highlight outstanding strengths and primary blind spots.
             3. Provide 3 major strategic recommendations for their future long-term training cycle.
             4. Keep length between 250 to 400 words. Format with markdown.`
          : `You are a professional fitness personal trainer... (existing monthly prompt)`;
```

- [ ] **Step 2: Implement `/api/logs/monthly-analysis/chat` endpoint**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), add the new chat route:
```typescript
app.post('/api/logs/monthly-analysis/chat', async (req: Request, res: Response) => {
  try {
    const SUPPORTED_GEMINI_MODELS = [
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-1.5-pro'
    ];
    const { stats, coachFeedback, history, message, model: requestedModel } = req.body;
    let modelName = 'gemini-flash-latest';
    if (requestedModel && SUPPORTED_GEMINI_MODELS.includes(requestedModel)) {
      modelName = requestedModel;
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    const systemInstruction = `You are a professional fitness personal trainer. You are chatting with a client who has just read their training report.
    Here is their training statistics:
    - Days trained: ${stats?.totalDays || 0}
    - Total sets: ${stats?.totalSets || 0}
    - Muscle distribution (sets): ${JSON.stringify(stats?.muscleDistribution || {})}
    
    Here is the initial coach report that was generated for them:
    ${coachFeedback || ''}
    
    Please answer the client's next question in Traditional Chinese (繁體中文). Keep your tone encouraging, professional, and practical. Keep the response concise (within 150-250 words).`;

    const model = ai.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction
    });

    const chatSession = model.startChat({
      history: (history || []).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }))
    });

    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();
    res.json({ response: responseText });
  } catch (err) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Failed to chat with AI coach.' });
  }
});
```

- [ ] **Step 3: Verify backend compilation**

Run: `npm run build` inside `/opt/gym-tracker/backend`
Expected: Compile succeeds with exit code 0.

- [ ] **Step 4: Commit changes**

Run:
```bash
git add backend/src/server.ts
git commit -m "backend: add all-time logs aggregation and stateless AI Coach chat API"
```

---

### Task 2: Frontend Dropdown Option & LocalStorage Chatbox UI

**Files:**
- Modify: `frontend/src/components/AnalyticsCharts.tsx`

- [ ] **Step 1: Add "全部歷史紀錄" to the month select dropdown**

In [frontend/src/components/AnalyticsCharts.tsx](file:///opt/gym-tracker/frontend/src/components/AnalyticsCharts.tsx), modify the Month select dropdown around line 700 to insert the all-time option:
```jsx
              <select
                className="equipment-search"
                style={{ width: '120px', padding: '5px 10px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)' }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all-time">全部歷史紀錄</option>
                {availableMonths.map((m) => {
                  const [y, mm] = m.split('-');
                  return <option key={m} value={m}>{`${y}年${parseInt(mm)}月`}</option>;
                })}
              </select>
```

- [ ] **Step 2: Add Chat states and LocalStorage synchronization**

In `AnalyticsCharts.tsx`, add the following state variables:
```typescript
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isWaitingForChat, setIsWaitingForChat] = useState(false);
```
Add a `useEffect` hook to load the chat history from LocalStorage whenever the selected month or report ID changes:
```typescript
  React.useEffect(() => {
    if (reportData) {
      const saved = localStorage.getItem(`gym_chat_${selectedMonth}`);
      if (saved) {
        try {
          setChatHistory(JSON.parse(saved));
        } catch (e) {
          setChatHistory([]);
        }
      } else {
        setChatHistory([]);
      }
    } else {
      setChatHistory([]);
    }
  }, [selectedMonth, reportData]);
```

- [ ] **Step 3: Implement chat submission logic**

Create the function to handle sending messages to `/api/logs/monthly-analysis/chat`:
```typescript
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !reportData || isWaitingForChat) return;

    const userMessage = chatInput.trim();
    const updatedHistory = [...chatHistory, { role: 'user' as const, content: userMessage }];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsWaitingForChat(true);

    try {
      const res = await fetch('/api/logs/monthly-analysis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: reportData.stats,
          coachFeedback: reportData.coachFeedback,
          history: chatHistory.slice(-10), // Send last 10 messages for rolling memory context
          message: userMessage,
          model: selectedModel
        })
      });

      if (res.ok) {
        const data = await res.json();
        const nextHistory = [...updatedHistory, { role: 'model' as const, content: data.response }];
        setChatHistory(nextHistory);
        localStorage.setItem(`gym_chat_${selectedMonth}`, JSON.stringify(nextHistory));
      } else {
        alert('教練好像分心了，請再試一次。');
      }
    } catch (err) {
      console.error('Chat error:', err);
      alert('網路連線失敗，請檢查您的連線。');
    } finally {
      setIsWaitingForChat(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('確定要清除與此份報告的對話紀錄嗎？')) {
      setChatHistory([]);
      localStorage.removeItem(`gym_chat_${selectedMonth}`);
    }
  };
```

- [ ] **Step 4: Render Chat Window UI**

Below the `coachFeedback` report viewer (around line 770), render the chatbox:
```jsx
              {/* Chatbox Section */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>💬 與 AI 教練討論報告</h4>
                  {chatHistory.length > 0 && (
                    <button 
                      onClick={handleClearChat}
                      style={{ fontSize: '11px', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 0 }}
                    >
                      清除對話
                    </button>
                  )}
                </div>

                {/* Messages Box */}
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                  {chatHistory.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted-dark)', textAlign: 'center', margin: '20px 0' }}>
                      對這份報告有疑問嗎？在下方輸入訊息，向 AI 教練發問吧！
                    </p>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '80%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          backgroundColor: msg.role === 'user' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                          border: msg.role === 'user' ? 'none' : '1px solid var(--border-gold)',
                          color: msg.role === 'user' ? '#000000' : 'var(--text-light)'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isWaitingForChat && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '8px 12px', fontSize: '12px', borderRadius: '12px 12px 12px 2px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-gold)', color: 'var(--text-muted-dark)' }}>
                        教練正在思考中...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="例如：背部組數偏高有什麼影響？如何平衡？"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isWaitingForChat}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-gold)', color: 'var(--text-dark)', borderRadius: '4px' }}
                  />
                  <button
                    type="submit"
                    className="btn-gold"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={isWaitingForChat || !chatInput.trim()}
                  >
                    傳送
                  </button>
                </form>
              </div>
```

- [ ] **Step 5: Verify frontend compilation**

Run: `npm run build` inside `/opt/gym-tracker/frontend`
Expected: Compile succeeds with exit code 0.

- [ ] **Step 6: Commit changes**

Run:
```bash
git add frontend/src/components/AnalyticsCharts.tsx
git commit -m "frontend: add All-Time option and LocalStorage-backed chatbox UI for AI Coach discussions"
```

---

### Task 3: Deployment & Verification

- [ ] **Step 1: Rebuild and restart both containers**

Run: `docker compose up -d --build`
Expected: Both `gym-backend` and `gym-frontend` containers compile and restart successfully.

- [ ] **Step 2: Verify All-Time Analysis generation**

Navigate to `http://localhost:8085` (Analytics tab), select "全部歷史紀錄" (All-Time), and click "產生報告". Verify that it aggregates stats across multiple months, generates a macro trend report, and displays the `✨ Gemini AI 教練` badge.

- [ ] **Step 3: Verify AI Coach Chat**

Open a generated report, type a question in the chatbox, and click "傳送". Verify that:
1. The user bubble displays immediately.
2. "教練正在思考中..." indicator appears.
3. The coach's response appears in Traditional Chinese, answering your question.
4. Refreshing the browser page preserves the conversation history for that specific report.
5. Clicking "清除對話" wipes the message history.

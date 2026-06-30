import { GoogleGenerativeAI } from '@google/generative-ai';

// Singleton AI Client
let aiClientInstance: GoogleGenerativeAI | null = null;

export function getAIClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClientInstance) {
    aiClientInstance = new GoogleGenerativeAI(apiKey);
  }
  return aiClientInstance;
}

// Robust timezone-agnostic age calculation
export function calculateAge(birthdateStr: string | null | undefined): string {
  if (!birthdateStr) return '未設定';
  const match = birthdateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '未設定';

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS 0-indexed month
  const day = parseInt(match[3], 10);

  const birthDate = new Date(year, month, day);
  if (
    isNaN(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month ||
    birthDate.getDate() !== day
  ) {
    return '未設定';
  }

  const now = new Date();
  let age = now.getFullYear() - year;
  const m = now.getMonth() - month;
  if (m < 0 || (m === 0 && now.getDate() < day)) {
    age--;
  }

  return age >= 0 ? `${age} 歲` : '未設定';
}

// Clean and un-indented prompt context string helper
export function getProfileContext(profile: any, ageStr: string): string {
  if (!profile) return '';
  return `生理特徵背景資訊：
- 身高：${profile.height ? `${profile.height} cm` : '未提供'}
- 體重：${profile.weight ? `${profile.weight} kg` : '未提供'}
- 年齡：${ageStr}
- 健身經驗階段：${profile.experience || '未提供'}
- 當前健身目標：${profile.fitnessGoal || '未提供'}`;
}

// Helper rule-based coach engine (Fallback)
export function getLocalCoachingFeedback(
  totalDays: number,
  totalSets: number,
  dist: Record<string, number>,
  isAllTime = false
): string {
  const entries = Object.entries(dist);
  let dominantMuscle = '無';
  let dominantSets = 0;
  let cardioSets = dist['CARDIO'] || 0;

  entries.forEach(([m, s]) => {
    if (m !== 'CARDIO' && s > dominantSets) {
      dominantSets = s;
      dominantMuscle = m;
    }
  });

  const muscleLabels: Record<string, string> = {
    CHEST_UPPER: '上胸', CHEST_LOWER: '中下胸', BACK_LAT: '背闊肌',
    BACK_UPPER: '上背/斜方', BACK_LOWER: '下背豎脊肌', SHOULDERS_FRONT: '前三角肌',
    SHOULDERS_LAT: '側三角肌', SHOULDERS_REAR: '後三角肌', ARMS_BICEPS: '肱二頭肌',
    ARMS_TRICEPS: '肱三頭肌', ARMS_FOREARM: '前臂', LEGS_QUADS: '股四頭肌',
    LEGS_HAMSTRINGS: '大腿後側', LEGS_GLUTES: '臀肌', LEGS_CALVES: '小腿肌',
    CORE_ABS: '腹肌', CORE_OBLIQUE: '側腹肌', CARDIO: '有氧心肺'
  };

  const activeLabel = muscleLabels[dominantMuscle] || dominantMuscle;

  let consistencyMsg = '';
  const timeFrameStr = isAllTime ? '累計' : '本月';
  const nextTimeFrameStr = isAllTime ? '未來' : '下月';
  if (totalDays >= 8) {
    consistencyMsg = `您${timeFrameStr}已訓練了 **${totalDays} 天**，頻率非常優異且極具紀律！完成的 **${totalSets} 組** 組數證明了您的努力。`;
  } else if (totalDays >= 4) {
    consistencyMsg = `您${timeFrameStr}已訓練了 **${totalDays} 天**，維持了基本運動習慣。完成的 **${totalSets} 組** 表現平穩，${nextTimeFrameStr}可挑戰更高頻率。`;
  } else {
    consistencyMsg = `您${timeFrameStr}已訓練了 **${totalDays} 天**，次數偏少。建議${nextTimeFrameStr}將訓練排入固定行程，以規律頻率（如每週 1-2 次）踏出第一步。`;
  }

  let balanceMsg = '';
  if (dominantSets > 0) {
    balanceMsg = `從肌群分佈來看，${timeFrameStr}您的主要精力集中在 **${activeLabel}**（共 ${dominantSets} 組）。這有助於強化該區域的肌肉，但也請務必平衡其他對抗肌群（例如胸背平衡、股四頭與大腿後側平衡），以避免肌肉不對稱與受傷風險。`;
  } else if (cardioSets > 0) {
    balanceMsg = `${timeFrameStr}您的訓練主要偏向有氧運動（共 ${cardioSets} 組），心肺耐力的提升將非常有感！`;
  } else {
    balanceMsg = `${timeFrameStr}無明顯的肌群比重，建議${nextTimeFrameStr}可以為自己制定一至兩個重點訓練部位。`;
  }

  return `### 📊 ${isAllTime ? '歷史' : '本月'}訓練表現總評
${consistencyMsg}

### ⚖️ 肌群平衡診斷
${balanceMsg}

### 🚀 ${isAllTime ? '未來' : '下月'}教練訓練建議
1. **設定對抗平衡**：若${isAllTime ? '先前' : '本月'}著重推的動作，${nextTimeFrameStr}可增加拉的動作（如背部拉伸或划船），維持肩關節健康。
2. **漸進式超負荷**：每週嘗試微幅提升 1-2 公斤重量或多增加 1 次反覆次數，以持續給肌肉帶來刺激。
3. **注重熱身與恢復**：每週確保至少有 1-2 天完整休息，讓肌肉組織在充足睡眠與蛋白質補充下修復生長。`;
}

// 1. Generate Goal Recommendations using Gemini
export async function recommendGoals(profile: any, logs: any[], todayStr: string): Promise<any[]> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('Gemini API client not initialized');
  }

  const ageStr = calculateAge(profile.birthdate);
  let bmiStr = '未設定';
  if (profile.height && profile.weight) {
    const heightInMeters = profile.height / 100;
    const bmi = profile.weight / (heightInMeters * heightInMeters);
    bmiStr = bmi.toFixed(1);
  }

  let historySummary = '';
  if (logs.length === 0) {
    historySummary = '無任何訓練紀錄。';
  } else {
    historySummary = logs
      .map((log) => {
        const dateStr = log.loggedAt instanceof Date ? log.loggedAt.toISOString().split('T')[0] : new Date(log.loggedAt).toISOString().split('T')[0];
        const equipmentName = log.equipment?.customName || log.equipment?.type || '未知器材';
        const muscleGroup = log.equipment?.muscleGroup || '未知肌群';
        const setsStr = log.sets
          .map((s: any) => {
            if (muscleGroup === 'CARDIO') {
              return `組數 ${s.setNumber}: ${s.weight} km, ${s.reps} 分鐘 (強度 RPE: ${s.rpe ?? '無'}, 坡度: ${s.incline ?? '無'}, 阻力: ${s.resistance ?? '無'}, 心率: ${s.heartRate ?? '無'})`;
            } else {
              return `組數 ${s.setNumber}: ${s.weight} kg x ${s.reps} 次 (強度 RPE: ${s.rpe ?? '無'})`;
            }
          })
          .join('; ');
        return `- [${dateStr}] 器材: ${equipmentName} (${muscleGroup}) - ${setsStr}${log.notes ? ` (備註: ${log.notes})` : ''}`;
      })
      .join('\n');
  }

  const prompt = `你是一位專業的 AI 健身教練。請根據以下使用者的生理特徵與最近最多 10 筆的訓練歷史紀錄，為他推薦 2 到 3 個客製化的健身目標（長期目標 GOAL 或短期挑戰 CHALLENGE）。

[使用者背景資訊]
- 當前日期（今天）：${todayStr}
- 年齡：${ageStr}
- 身高：${profile.height ? `${profile.height} cm` : '未設定'}
- 體重：${profile.weight ? `${profile.weight} kg` : '未設定'}
- BMI：${bmiStr}
- 健身經驗階段：${profile.experience || '未設定'}
- 當前健身目標：${profile.fitnessGoal || '未設定'}

[最近最多 10 筆訓練歷史]
${historySummary}

[生成目標的要求]
1. 必須生成 2 到 3 個目標。
2. 每個目標 must contain following properties, and must strictly match the database schema of Goal:
   - title: 目標/挑戰的名稱（例如：「深蹲突破 100 kg」、「本週有氧跑步 10 km」、「維持每週訓練 3 次」）
   - type: 必須是 "GOAL" (長期目標) 或 "CHALLENGE" (短期挑戰)
   - metricType: 進度追蹤指標，必須是 "VOLUME" (總量), "DISTANCE" (距離), "DURATION" (時間), "WEIGHT_MAX" (最大重量), "CUSTOM" (純手動勾選) 之一
   - targetValue: 目標值 (正浮點數)
   - unit: 單位，例如: "kg", "km", "minutes", "times"
   - deadline: 截止日期 (格式: YYYY-MM-DD，若無截止日期則設定為 null，或者是相較於今天（${todayStr}）大約 1 到 4 週後的未來日期字串。請確保年份與今天相同)
   - isCompleted: 預設為 false
   - aiFeedback: 儲存你對此目標的可行性評估與簡短建議（100字以內）
3. metricType 必須與你的目標名稱及單位一致。
   - 例如：如果 title 為「深蹲突破 100 kg」，那麼 type="GOAL", metricType="WEIGHT_MAX", targetValue=100, unit="kg"
   - 如果 title 為「本週跑步 10 km」，那麼 type="CHALLENGE", metricType="DISTANCE", targetValue=10, unit="km"
4. 回覆格式：
   必須只回覆一個 JSON 陣列，其中每個元素是符合上述欄位的 JSON 物件。不要包含 markdown 標記（如 \`\`\`json）或任何其他文字。`;

  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  const response = await model.generateContent(prompt);
  const text = response.response.text().trim();
  const recommendations = JSON.parse(text);
  if (!Array.isArray(recommendations)) {
    throw new Error('Gemini response is not a JSON array');
  }
  return recommendations;
}

// 2. Evaluate Goal Feasibility using Gemini
export async function evaluateGoalFeasibility(goal: any, profile: any): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('Gemini API client not initialized');
  }

  const ageStr = calculateAge(profile?.birthdate);
  const profileContext = getProfileContext(profile, ageStr);

  const prompt = `你是一位專業的 AI 健身教練。請根據以下使用者的生理特徵與他所設定的訓練目標進行「可行性評估」：

[使用者背景資訊]
${profileContext || '未提供生理特徵背景資訊。'}

[設定的目標]
- 名稱：${goal.title}
- 目標值：${goal.targetValue} ${goal.unit}
- 類型：${goal.type === 'GOAL' ? '長期目標' : '短期挑戰'}
- 指標類型：${goal.metricType}
- 截止日期：${goal.deadline || '未設定'}

請在 150 字以內，給出一個客觀、科學的評估建議：
1. 評估這個目標是否安全合理（若過於激進，請提出警告）。
2. 提供 1-2 點具體的訓練或執行建議。
3. 語氣保持 professional、積極鼓勵但安全第一。`;

  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const response = await model.generateContent(prompt);
  return response.response.text().trim();
}

// 3. Generate Monthly Report using Gemini
export async function generateMonthlyReport(
  logs: any[],
  stats: { totalDays: number; totalSets: number; muscleDistribution: Record<string, number> },
  yearMonth: string,
  modelName: string,
  profile: any
): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('Gemini API client not initialized');
  }

  const ageStr = calculateAge(profile?.birthdate);
  const profileContext = getProfileContext(profile, ageStr);
  const model = ai.getGenerativeModel({ model: modelName });

  const isAllTime = yearMonth === 'all-time';
  const prompt = isAllTime
    ? `You are a professional fitness personal trainer. Please write a long-term fitness training analysis report in Traditional Chinese (繁體中文) based on their entire workout history.
       Here are the user's lifetime workout statistics:
       - Total active workout days: ${stats.totalDays} days
       - Total completed sets: ${stats.totalSets} sets
       - Lifetime training volume per muscle group (in sets): ${JSON.stringify(stats.muscleDistribution)}
       
       ${profileContext}
       
       Guidelines:
       1. Start with a warm greeting and review their total lifetime progress.
       2. Analyze their muscle balance over the long run. Highlight outstanding strengths and primary blind spots.
       3. Provide 3 major strategic recommendations for their future long-term training cycle.
       4. Keep length between 250 to 400 words. Format with markdown (headers, bullet points).
       請特別考慮使用者的生理背景資訊來客製化報告建議。`
    : `You are a professional fitness personal trainer. Please write a monthly training report feedback in Traditional Chinese (繁體中文).
       Here are the user's workout statistics for the month of ${yearMonth}:
       - Total active workout days: ${stats.totalDays} days
       - Total completed sets: ${stats.totalSets} sets
       - Training volume per muscle group (in sets): ${JSON.stringify(stats.muscleDistribution)}
       
       ${profileContext}
       
       Guidelines for your response:
       1. Start with a warm greeting and brief overview of their training volume.
       2. Analyze their muscle group balance. Point out if they are neglecting any area or if they have a strong focus.
       3. Provide 3 actionable and specific fitness tips for the upcoming month.
       4. Keep the total response length between 250 to 400 words. Format the response with markdown (headers, bullet points).
       請特別考慮使用者的生理背景資訊來客製化報告建議。`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// 4. Chat with Coach using Gemini
export async function chatWithCoach(
  stats: any,
  coachFeedback: string,
  profile: any,
  history: any[],
  message: string,
  modelName: string
): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('Gemini API client not initialized');
  }

  const ageStr = calculateAge(profile?.birthdate);
  const profileContext = getProfileContext(profile, ageStr);

  const systemInstruction = `You are a professional fitness personal trainer. You are chatting with a client who has just read their training report.
  Here is their training statistics:
  - Days trained: ${stats?.totalDays || 0}
  - Total sets: ${stats?.totalSets || 0}
  - Muscle distribution (sets): ${JSON.stringify(stats?.muscleDistribution || {})}
  
  Here is the initial coach report that was generated for them:
  ${coachFeedback || ''}
  
  Here is their profile context:
  ${profileContext}
  
  Please answer the client's next question in Traditional Chinese (繁體中文). Keep your tone encouraging, professional, and practical. Keep the response concise (within 150-250 words). Please tailor all advice, recommendations, and corrections to their profile (e.g. adjust goals, training volume, energy intake based on height/weight/experience).`;

  const model = ai.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction
  });

  const validatedHistory = Array.isArray(history) ? history : [];
  const chatSession = model.startChat({
    history: validatedHistory
      .filter((h: any) => h && typeof h === 'object')
      .map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: typeof h.content === 'string' ? h.content : '' }]
      }))
  });

  const result = await chatSession.sendMessage(message);
  return result.response.text();
}

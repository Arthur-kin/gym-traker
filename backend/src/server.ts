import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8085';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.json());

import rateLimit from 'express-rate-limit';

// General API rate limiter (200 requests per 15 mins per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for AI endpoints (10 requests per 5 mins per IP)
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { error: 'AI limit reached. Please try again after 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Singleton AI Client
let aiClientInstance: GoogleGenerativeAI | null = null;
function getAIClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClientInstance) {
    aiClientInstance = new GoogleGenerativeAI(apiKey);
  }
  return aiClientInstance;
}

// Helper to get or create the default gym layout
async function getOrCreateDefaultLayout() {
  let layout = await prisma.gymLayout.findFirst({
    include: { equipment: true }
  });
  if (!layout) {
    layout = await prisma.gymLayout.create({
      data: {
        name: 'My Home Gym',
        width: 10,
        height: 10,
      },
      include: { equipment: true }
    });
  }
  return layout;
}

const PROFILE_ID = 'default-user-profile';

// Robust timezone-agnostic age calculation
function calculateAge(birthdateStr: string | null | undefined): string {
  if (!birthdateStr) return '未設定';
  const match = birthdateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '未設定';

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS 0-indexed month
  const day = parseInt(match[3], 10);

  // Validate if it is a real calendar date (handles Feb 31, etc.)
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
function getProfileContext(profile: any, ageStr: string): string {
  if (!profile) return '';
  return `生理特徵背景資訊：
- 身高：${profile.height ? `${profile.height} cm` : '未提供'}
- 體重：${profile.weight ? `${profile.weight} kg` : '未提供'}
- 年齡：${ageStr}
- 健身經驗階段：${profile.experience || '未提供'}
- 當前健身目標：${profile.fitnessGoal || '未提供'}`;
}

interface UpdateProfilePayload {
  height?: number | null;
  weight?: number | null;
  birthdate?: string | null;
  experience?: string | null;
  fitnessGoal?: string | null;
}

// GET /api/profile
app.get('/api/profile', async (req: Request, res: Response) => {
  try {
    let profile = await prisma.userProfile.findUnique({
      where: { id: PROFILE_ID }
    });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { id: PROFILE_ID }
      });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/profile
app.put('/api/profile', async (req: Request, res: Response) => {
  try {
    const { height, weight, birthdate, experience, fitnessGoal } = req.body as UpdateProfilePayload;

    if (height !== undefined && height !== null && (typeof height !== 'number' || height <= 0)) {
      return res.status(400).json({ error: 'Height must be a positive number' });
    }
    if (weight !== undefined && weight !== null && (typeof weight !== 'number' || weight <= 0)) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    if (birthdate !== undefined && birthdate !== null && birthdate !== '') {
      if (typeof birthdate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        return res.status(400).json({ error: 'Birthdate must be in YYYY-MM-DD format' });
      }
    }

    const validExp = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', null, ''];
    if (experience !== undefined && experience !== null && !validExp.includes(experience)) {
      return res.status(400).json({ error: 'Invalid experience level' });
    }

    const validGoals = ['LOSE_FAT', 'BUILD_MUSCLE', 'MAINTENANCE', null, ''];
    if (fitnessGoal !== undefined && fitnessGoal !== null && !validGoals.includes(fitnessGoal)) {
      return res.status(400).json({ error: 'Invalid fitness goal' });
    }

    // Normalize empty strings to null
    const birthdateValue = birthdate === '' ? null : birthdate;
    const experienceValue = experience === '' ? null : experience;
    const fitnessGoalValue = fitnessGoal === '' ? null : fitnessGoal;

    const updated = await prisma.userProfile.upsert({
      where: { id: PROFILE_ID },
      update: {
        height,
        weight,
        birthdate: birthdateValue,
        experience: experienceValue,
        fitnessGoal: fitnessGoalValue
      },
      create: {
        id: PROFILE_ID,
        height,
        weight,
        birthdate: birthdateValue,
        experience: experienceValue,
        fitnessGoal: fitnessGoalValue
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});


interface CreateGoalPayload {
  title: string;
  type: string;
  metricType: string;
  targetValue: number;
  unit?: string;
  deadline?: string | null;
  aiFeedback?: string;
}

interface UpdateGoalPayload {
  title?: string;
  currentValue?: number;
  isCompleted?: boolean;
  targetValue?: number;
  deadline?: string | null;
}

// GET /api/goals
app.get('/api/goals', async (req: Request, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (err) {
    console.error('Failed to fetch goals:', err);
    res.status(500).json({ error: 'Failed to fetch goals.' });
  }
});

// GET /api/goals/recommend
app.get('/api/goals/recommend', aiLimiter, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: PROFILE_ID }
    });
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const logs = await prisma.workoutLog.findMany({
      take: 10,
      include: {
        equipment: true,
        sets: {
          orderBy: { setNumber: 'asc' }
        }
      },
      orderBy: { loggedAt: 'desc' }
    });

    let historySummary = '';
    if (logs.length === 0) {
      historySummary = '無任何訓練紀錄。';
    } else {
      historySummary = logs
        .map(log => {
          const dateStr = log.loggedAt.toISOString().split('T')[0];
          const equipmentName = log.equipment?.customName || log.equipment?.type || '未知器材';
          const muscleGroup = log.equipment?.muscleGroup || '未知肌群';
          const setsStr = log.sets
            .map(s => {
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

    const ageStr = calculateAge(profile.birthdate);
    let bmiStr = '未設定';
    if (profile.height && profile.weight) {
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      bmiStr = bmi.toFixed(1);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

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
   - deadline: 截止日期 (格式: YYYY-MM-DD，若無截止日期則設定為 null，或者是相較於今天（${todayStr}）大約 1 到 4 週後的未來日期字串。請確保年份與今天相同為 ${today.getFullYear()} 年)
   - isCompleted: 預設為 false
   - aiFeedback: 儲存你對此目標的可行性評估與簡短建議（100字以內）
3. metricType 必須與你的目標名稱及單位一致。
   - 例如：如果 title 為「深蹲突破 100 kg」，那麼 type="GOAL", metricType="WEIGHT_MAX", targetValue=100, unit="kg"
   - 如果 title 為「本週跑步 10 km」，那麼 type="CHALLENGE", metricType="DISTANCE", targetValue=10, unit="km"
4. 回覆格式：
   必須只回覆一個 JSON 陣列，其中每個元素是符合上述欄位的 JSON 物件。不要包含 markdown 標記（如 \`\`\`json）或任何其他文字。`;

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    try {
      const recommendations = JSON.parse(text);
      if (!Array.isArray(recommendations)) {
        throw new Error('Gemini response is not a JSON array');
      }
      res.json(recommendations);
    } catch (parseErr) {
      console.error('Failed to parse Gemini recommendations output:', text, parseErr);
      res.status(500).json({ error: 'AI generated invalid recommendations format.' });
    }
  } catch (error) {
    console.error('Failed to recommend goals:', error);
    res.status(500).json({ error: 'Failed to recommend goals.' });
  }
});

// POST /api/goals
app.post('/api/goals', async (req: Request, res: Response) => {
  try {
    const { title, type, metricType, targetValue, unit, deadline, aiFeedback } = req.body as CreateGoalPayload;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string.' });
    }

    const validTypes = ['GOAL', 'CHALLENGE'];
    if (!type || typeof type !== 'string' || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Type must be either "GOAL" or "CHALLENGE".' });
    }

    const validMetricTypes = ['VOLUME', 'DISTANCE', 'DURATION', 'WEIGHT_MAX', 'CUSTOM'];
    if (!metricType || typeof metricType !== 'string' || !validMetricTypes.includes(metricType)) {
      return res.status(400).json({ error: 'MetricType must be one of "VOLUME", "DISTANCE", "DURATION", "WEIGHT_MAX", "CUSTOM".' });
    }

    const parsedTarget = typeof targetValue === 'number' ? targetValue : parseFloat(String(targetValue));
    if (Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ error: 'TargetValue must be a positive number.' });
    }

    if (deadline !== undefined && deadline !== null && deadline !== '') {
      if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        return res.status(400).json({ error: 'Deadline must be in YYYY-MM-DD format.' });
      }
    }

    const goal = await prisma.goal.create({
      data: {
        title: title.trim(),
        type,
        metricType,
        targetValue: parsedTarget,
        unit: (unit && typeof unit === 'string') ? unit.trim() : '',
        deadline: (deadline && deadline !== '') ? deadline : null,
        aiFeedback: (aiFeedback && typeof aiFeedback === 'string') ? aiFeedback.trim() : null
      }
    });
    res.json(goal);
  } catch (err) {
    console.error('Failed to create goal:', err);
    res.status(500).json({ error: 'Failed to create goal.' });
  }
});

// PUT /api/goals/:id
app.put('/api/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, currentValue, isCompleted, targetValue, deadline } = req.body as UpdateGoalPayload;

    const data: any = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title must be a non-empty string.' });
      }
      data.title = title.trim();
    }

    if (currentValue !== undefined) {
      const parsedCurrent = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue));
      if (Number.isNaN(parsedCurrent) || parsedCurrent < 0) {
        return res.status(400).json({ error: 'CurrentValue must be a non-negative number.' });
      }
      data.currentValue = parsedCurrent;
    }

    if (isCompleted !== undefined) {
      if (typeof isCompleted !== 'boolean') {
        return res.status(400).json({ error: 'IsCompleted must be a boolean.' });
      }
      data.isCompleted = isCompleted;
    }

    if (targetValue !== undefined) {
      const parsedTarget = typeof targetValue === 'number' ? targetValue : parseFloat(String(targetValue));
      if (Number.isNaN(parsedTarget) || parsedTarget <= 0) {
        return res.status(400).json({ error: 'TargetValue must be a positive number.' });
      }
      data.targetValue = parsedTarget;
    }

    if (deadline !== undefined) {
      if (deadline !== null && deadline !== '') {
        if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
          return res.status(400).json({ error: 'Deadline must be in YYYY-MM-DD format.' });
        }
        data.deadline = deadline;
      } else {
        data.deadline = null;
      }
    }

    const updated = await prisma.goal.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (err: any) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    console.error('Failed to update goal:', err);
    res.status(500).json({ error: 'Failed to update goal.' });
  }
});

// DELETE /api/goals/:id
app.delete('/api/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.goal.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (err: any) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    console.error('Failed to delete goal:', err);
    res.status(500).json({ error: 'Failed to delete goal.' });
  }
});

// POST /api/goals/:id/evaluate
app.post('/api/goals/:id/evaluate', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { id: PROFILE_ID }
    });
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
3. 語氣保持專業、積極鼓勵但安全第一。`;

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    const updated = await prisma.goal.update({
      where: { id },
      data: { aiFeedback: text }
    });
    res.json(updated);
  } catch (err) {
    console.error('AI evaluation failed:', err);
    res.status(500).json({ error: 'AI evaluation failed.' });
  }
});


// 1. GET /api/layout - 取得健身房佈置與器材
app.get('/api/layout', async (req: Request, res: Response) => {
  try {
    const layout = await getOrCreateDefaultLayout();
    res.json(layout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch gym layout' });
  }
});

// 2. POST /api/layout - 儲存健身房器材擺設 (覆蓋式更新)
app.post('/api/layout', async (req: Request, res: Response) => {
  try {
    const { name, width, height, equipment } = req.body;
    const defaultLayout = await getOrCreateDefaultLayout();

    // 在交易中更新佈局，並覆蓋擺放的器材
    const updatedLayout = await prisma.$transaction(async (tx) => {
      // 1. 更新佈局基本資訊
      await tx.gymLayout.update({
        where: { id: defaultLayout.id },
        data: { name: name || defaultLayout.name, width: width || defaultLayout.width, height: height || defaultLayout.height }
      });

      // 2. 刪除所有原本未在此次清單中的器材 (若要完全以新清單為準，可以直接刪除全部重新建立)
      // 注意: 為了保留歷史訓練紀錄，對於已存在且 id 相同的器材，我們應更新它的座標與旋轉，而不是刪除重建。
      // 對於沒有 id 的新器材，我們新建；對於清單中不存在的舊器材，我們刪除（Prisma 會級聯刪除紀錄，但最好提醒用戶，或者只保留記錄）。
      const incomingIds = (equipment || [])
        .map((eq: any) => eq.id)
        .filter((id: string) => !!id);

      // 刪除沒有出現在 incoming 列表中的器材
      await tx.placedEquipment.deleteMany({
        where: {
          layoutId: defaultLayout.id,
          id: { notIn: incomingIds }
        }
      });

      // 3. 處理更新與新建
      const savedEquipment = [];
      for (const eq of (equipment || [])) {
        if (eq.id) {
          // 已存在的器材，更新座標、角度與名稱
          const updated = await tx.placedEquipment.update({
            where: { id: eq.id },
            data: {
              customName: eq.customName,
              muscleGroup: eq.muscleGroup,
              gridX: eq.gridX,
              gridY: eq.gridY,
              rotation: eq.rotation,
            }
          });
          savedEquipment.push(updated);
        } else {
          // 新器材，建立之
          const created = await tx.placedEquipment.create({
            data: {
              layoutId: defaultLayout.id,
              type: eq.type,
              customName: eq.customName || eq.type,
              muscleGroup: eq.muscleGroup,
              gridX: eq.gridX,
              gridY: eq.gridY,
              rotation: eq.rotation || 0,
            }
          });
          savedEquipment.push(created);
        }
      }

      return tx.gymLayout.findUnique({
        where: { id: defaultLayout.id },
        include: { equipment: true }
      });
    });

    res.json(updatedLayout);
  } catch (error) {
    console.error('Error saving layout:', error);
    res.status(500).json({ error: 'Failed to save gym layout' });
  }
});

// 3. GET /api/logs - 取得所有訓練紀錄 (依時間倒序，包含組數及器材資訊)
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      include: {
        equipment: true,
        sets: {
          orderBy: { setNumber: 'asc' }
        }
      },
      orderBy: { loggedAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

interface IncomingWorkoutSet {
  setNumber?: number;
  weight: string | number;
  reps: string | number;
  rpe?: string | number | null;
  incline?: string | number | null;
  resistance?: string | number | null;
  heartRate?: string | number | null;
}

function parseOptionalFloat(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalInt(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapAndValidateWorkoutSets(sets: IncomingWorkoutSet[]): any[] {
  return sets.map((s, idx) => {
    const weight = typeof s.weight === 'number' ? s.weight : parseFloat(String(s.weight));
    const reps = typeof s.reps === 'number' ? s.reps : parseInt(String(s.reps), 10);

    if (Number.isNaN(weight) || weight < 0) {
      throw new Error(`Set ${idx + 1} must have a valid positive weight`);
    }
    if (Number.isNaN(reps) || reps < 0) {
      throw new Error(`Set ${idx + 1} must have a valid positive number of reps`);
    }

    return {
      setNumber: s.setNumber || (idx + 1),
      weight,
      reps,
      rpe: parseOptionalInt(s.rpe),
      incline: parseOptionalFloat(s.incline),
      resistance: parseOptionalInt(s.resistance),
      heartRate: parseOptionalInt(s.heartRate),
    };
  });
}

// 4. POST /api/logs - 新增一筆訓練紀錄
app.post('/api/logs', async (req: Request, res: Response) => {
  try {
    const { equipmentId, sets, notes, loggedAt } = req.body;

    if (!equipmentId || !sets || !Array.isArray(sets) || sets.length === 0) {
      return res.status(400).json({ error: 'Invalid workout log data' });
    }

    let mappedSets;
    try {
      mappedSets = mapAndValidateWorkoutSets(sets);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }

    const newLog = await prisma.workoutLog.create({
      data: {
        equipmentId,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        notes,
        sets: {
          create: mappedSets
        }
      },
      include: {
        equipment: true,
        sets: true
      }
    });

    await updateGoalsProgress();
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Failed to record workout log' });
  }
});

// 4.5 PUT /api/logs/:id - 更新訓練紀錄與組數
app.put('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sets, notes } = req.body;

    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      return res.status(400).json({ error: 'Invalid workout log data' });
    }

    let mappedSets;
    try {
      mappedSets = mapAndValidateWorkoutSets(sets);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      // Delete existing sets
      await tx.workoutSet.deleteMany({
        where: { logId: id }
      });

      // Update notes and recreate sets
      return await tx.workoutLog.update({
        where: { id },
        data: {
          notes,
          sets: {
            create: mappedSets
          }
        },
        include: {
          equipment: true,
          sets: true
        }
      });
    });

    await updateGoalsProgress();
    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ error: 'Failed to update workout log' });
  }
});

// 6. POST /api/logs/monthly-analysis - 生成月度訓練報告 (AI 智慧分析)
app.post('/api/logs/monthly-analysis', aiLimiter, async (req: Request, res: Response) => {
  try {
    const SUPPORTED_GEMINI_MODELS = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-latest',
      'gemini-pro-latest'
    ];

    const { yearMonth, model: requestedModel } = req.body; // 格式: "YYYY-MM" (e.g. "2026-06") 或 "all-time"
    let modelName = 'gemini-2.5-flash';
    if (requestedModel && SUPPORTED_GEMINI_MODELS.includes(requestedModel)) {
      modelName = requestedModel;
    }

    if (!yearMonth || (yearMonth !== 'all-time' && !/^\d{4}-\d{2}$/.test(yearMonth))) {
      return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM or "all-time".' });
    }

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
      const startOfMonth = new Date(`${yearMonth}-01T00:00:00Z`);
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

    // 1. Calculate stats
    const totalDays = new Set(logs.map(log => new Date(log.loggedAt).toISOString().split('T')[0])).size;
    let totalSets = 0;
    const muscleDistribution: Record<string, number> = {};

    logs.forEach(log => {
      totalSets += log.sets.length;
      const group = log.equipment?.muscleGroup || 'ANY';
      muscleDistribution[group] = (muscleDistribution[group] || 0) + log.sets.length;
    });

    const hasLogs = logs.length > 0;
    let coachFeedback = '';
    const isRealAI = !!process.env.GEMINI_API_KEY;
    let isRealAIActive = isRealAI;

    if (!hasLogs) {
      coachFeedback = yearMonth === 'all-time'
        ? '您目前尚未留下任何訓練日誌，快到健身房開始您的第一次訓練吧！'
        : '這個月您尚未留下任何訓練日誌，快到健身房開始您的第一次訓練吧！';
      isRealAIActive = false;
    } else if (isRealAI) {
      // Setup Generative AI
      try {
        const profile = await prisma.userProfile.findUnique({
          where: { id: PROFILE_ID }
        });
        const ageStr = calculateAge(profile?.birthdate);
        const profileContext = getProfileContext(profile, ageStr);

        const ai = getAIClient();
        if (!ai) {
          throw new Error('Gemini API client not initialized');
        }
        const model = ai.getGenerativeModel({ model: modelName });

        const isAllTime = yearMonth === 'all-time';
        const prompt = isAllTime
          ? `You are a professional fitness personal trainer. Please write a long-term fitness training analysis report in Traditional Chinese (繁體中文) based on their entire workout history.
             Here are the user's lifetime workout statistics:
             - Total active workout days: ${totalDays} days
             - Total completed sets: ${totalSets} sets
             - Lifetime training volume per muscle group (in sets): ${JSON.stringify(muscleDistribution)}
             
             ${profileContext}
             
             Guidelines:
             1. Start with a warm greeting and review their total lifetime progress.
             2. Analyze their muscle balance over the long run. Highlight outstanding strengths and primary blind spots.
             3. Provide 3 major strategic recommendations for their future long-term training cycle.
             4. Keep length between 250 to 400 words. Format with markdown (headers, bullet points).
             請特別考慮使用者的生理背景資訊來客製化報告建議。`
          : `You are a professional fitness personal trainer. Please write a monthly training report feedback in Traditional Chinese (繁體中文).
             Here are the user's workout statistics for the month of ${yearMonth}:
             - Total active workout days: ${totalDays} days
             - Total completed sets: ${totalSets} sets
             - Training volume per muscle group (in sets): ${JSON.stringify(muscleDistribution)}
             
             ${profileContext}
             
             Guidelines for your response:
             1. Start with a warm greeting and brief overview of their training volume.
             2. Analyze their muscle group balance. Point out if they are neglecting any area or if they have a strong focus.
             3. Provide 3 actionable and specific fitness tips for the upcoming month.
             4. Keep the total response length between 250 to 400 words. Format the response with markdown (headers, bullet points).
             請特別考慮使用者的生理背景資訊來客製化報告建議。`;

        const result = await model.generateContent(prompt);
        coachFeedback = result.response.text();
      } catch (aiErr) {
        console.error('Gemini API Error, falling back to local algorithm:', aiErr);
        isRealAIActive = false;
        // Fallback to rule engine if API fails
        coachFeedback = getLocalCoachingFeedback(totalDays, totalSets, muscleDistribution, yearMonth === 'all-time');
      }
    } else {
      // Call local rule engine
      coachFeedback = getLocalCoachingFeedback(totalDays, totalSets, muscleDistribution, yearMonth === 'all-time');
    }

    res.json({
      yearMonth,
      stats: {
        totalDays,
        totalSets,
        muscleDistribution
      },
      coachFeedback,
      isRealAI: isRealAIActive
    });
  } catch (error) {
    console.error('Error generating monthly analysis:', error);
    res.status(500).json({ error: 'Failed to generate monthly workout report' });
  }
});

// POST /api/logs/monthly-analysis/chat - Stateless chat with AI Coach
app.post('/api/logs/monthly-analysis/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI Coach is not available because the Gemini API Key is not configured on the server.' });
    }

    const SUPPORTED_GEMINI_MODELS = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-flash-latest',
      'gemini-pro-latest'
    ];
    const { stats, coachFeedback, history, message, model: requestedModel } = req.body;
    let modelName = 'gemini-2.5-flash';
    if (requestedModel && SUPPORTED_GEMINI_MODELS.includes(requestedModel)) {
      modelName = requestedModel;
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const profile = await prisma.userProfile.findUnique({
      where: { id: PROFILE_ID }
    });
    const ageStr = calculateAge(profile?.birthdate);
    const profileContext = getProfileContext(profile, ageStr);

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    
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
    const responseText = result.response.text();
    res.json({ response: responseText });
  } catch (err) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Failed to chat with AI coach.' });
  }
});

// Helper rule-based coach engine (Fallback)
function getLocalCoachingFeedback(totalDays: number, totalSets: number, dist: Record<string, number>, isAllTime = false): string {
  // Find dominant and neglected muscles
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

  // Consistency review
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

  // Balance review
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

// 5. DELETE /api/logs/:id - 刪除特定訓練紀錄
app.delete('/api/logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.workoutLog.delete({
      where: { id }
    });
    await updateGoalsProgress();
    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({ error: 'Failed to delete workout log' });
  }
});

// 啟動伺服器並建立預設 Layout
app.listen(PORT, async () => {
  console.log(`[Gym Server] Backend running on port ${PORT}`);
  try {
    const defaultLayout = await getOrCreateDefaultLayout();
    console.log(`[Gym Server] Active Gym Layout: "${defaultLayout.name}" (${defaultLayout.width}x${defaultLayout.height})`);
  } catch (err) {
    console.error('[Gym Server] Failed to initialize default gym layout:', err);
  }
});

// Helper to update progress of all active goals and challenges based on workout logs
async function updateGoalsProgress(): Promise<void> {
  try {
    const activeGoals = await prisma.goal.findMany({
      where: {
        isCompleted: false,
        metricType: { not: 'CUSTOM' }
      }
    });

    if (activeGoals.length === 0) {
      return;
    }

    // Include equipment to identify CARDIO vs STRENGTH logs
    const logs = await prisma.workoutLog.findMany({
      include: {
        sets: true,
        equipment: true
      }
    });

    // Single pass to aggregate values
    let totalVolume = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    let maxWeight = 0;

    for (const log of logs) {
      const isCardio = log.equipment?.muscleGroup === 'CARDIO';
      if (log.sets) {
        for (const set of log.sets) {
          if (isCardio) {
            totalDistance += set.weight || 0;
            totalDuration += set.reps || 0;
          } else {
            totalVolume += (set.weight || 0) * (set.reps || 0);
            if (set.weight && set.weight > maxWeight) {
              maxWeight = set.weight;
            }
          }
        }
      }
    }

    // Batch parallel database updates using Promise.all
    const updatePromises = activeGoals.map((goal) => {
      let currentValue = 0;
      if (goal.metricType === 'VOLUME') {
        currentValue = totalVolume;
      } else if (goal.metricType === 'DISTANCE') {
        currentValue = totalDistance;
      } else if (goal.metricType === 'DURATION') {
        currentValue = totalDuration;
      } else if (goal.metricType === 'WEIGHT_MAX') {
        currentValue = maxWeight;
      }

      const isCompleted = currentValue >= goal.targetValue;

      return prisma.goal.update({
        where: { id: goal.id },
        data: {
          currentValue,
          isCompleted
        }
      });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error updating goals progress:', error);
  }
}

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { aiLimiter } from '../middleware/rateLimiter';
import { updateGoalsProgress } from '../utils/goalHelper';
import {
  generateMonthlyReport,
  chatWithCoach,
  getLocalCoachingFeedback
} from '../services/aiService';

const router = Router();
const PROFILE_ID = 'default-user-profile';

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

// 3. GET /api/logs - 取得所有訓練紀錄 (依時間倒序，包含組數及器材資訊，支援選填分頁)
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 0; // 0 means no pagination (all logs)

    const queryOptions: any = {
      include: {
        equipment: true,
        sets: {
          orderBy: { setNumber: 'asc' }
        }
      },
      orderBy: { loggedAt: 'desc' }
    };

    if (limit > 0) {
      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const logs = await prisma.workoutLog.findMany(queryOptions);

    if (limit > 0) {
      const totalCount = await prisma.workoutLog.count();
      return res.json({
        logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch workout logs' });
  }
});

// 4. POST /api/logs - 新增一筆訓練紀錄
router.post('/', async (req: Request, res: Response) => {
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
router.put('/:id', async (req: Request, res: Response) => {
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

// 5. DELETE /api/logs/:id - 刪除特定訓練紀錄
router.delete('/:id', async (req: Request, res: Response) => {
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

// 6. POST /api/logs/monthly-analysis - 生成月度訓練報告 (AI 智慧分析)
router.post('/monthly-analysis', aiLimiter, async (req: Request, res: Response) => {
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
        ? '您目前尚未留下 any 訓練日誌，快到健身房開始您的第一次訓練吧！'
        : '這個月您尚未留下 any 訓練日誌，快到健身房開始您的第一次訓練吧！';
      isRealAIActive = false;
    } else if (isRealAI) {
      try {
        const profile = await prisma.userProfile.findUnique({
          where: { id: PROFILE_ID }
        });
        const stats = { totalDays, totalSets, muscleDistribution };

        coachFeedback = await generateMonthlyReport(logs, stats, yearMonth, modelName, profile);
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
router.post('/monthly-analysis/chat', aiLimiter, async (req: Request, res: Response) => {
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

    try {
      const responseText = await chatWithCoach(stats, coachFeedback, profile, history, message, modelName);
      res.json({ response: responseText });
    } catch (aiErr) {
      console.error('Gemini Chat API Error:', aiErr);
      res.status(500).json({ error: 'Failed to chat with AI coach.' });
    }
  } catch (err) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Failed to chat with AI coach.' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { aiLimiter } from '../middleware/rateLimiter';
import { recommendGoals, evaluateGoalFeasibility, generatePPLPlan } from '../services/aiService';

const router = Router();
const PROFILE_ID = 'default-user-profile';

interface CreateGoalPayload {
  title: string;
  type: 'GOAL' | 'CHALLENGE';
  metricType: 'VOLUME' | 'DISTANCE' | 'DURATION' | 'WEIGHT_MAX' | 'CUSTOM';
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

// GET /api/goals - 取得所有目標
router.get('/', async (req: Request, res: Response) => {
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

// GET /api/goals/recommend - 獲取 AI 推薦目標
router.get('/recommend', aiLimiter, async (req: Request, res: Response) => {
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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
      const recommendations = await recommendGoals(profile, logs, todayStr);
      res.json(recommendations);
    } catch (aiErr) {
      console.error('Failed to recommend goals using AI:', aiErr);
      res.status(500).json({ error: 'AI generated invalid recommendations format.' });
    }
  } catch (error) {
    console.error('Failed to recommend goals:', error);
    res.status(500).json({ error: 'Failed to recommend goals.' });
  }
});

// POST /api/goals - 新增目標
router.post('/', async (req: Request, res: Response) => {
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

// PUT /api/goals/:id - 修改目標
router.put('/:id', async (req: Request, res: Response) => {
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

// DELETE /api/goals/:id - 刪除目標
router.delete('/:id', async (req: Request, res: Response) => {
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

// POST /api/goals/:id/evaluate - AI 目標可行性評估
router.post('/:id/evaluate', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { id: PROFILE_ID }
    });

    try {
      const feedback = await evaluateGoalFeasibility(goal, profile);
      const updated = await prisma.goal.update({
        where: { id },
        data: { aiFeedback: feedback }
      });
      res.json(updated);
    } catch (aiErr) {
      console.error('AI evaluation failed using Gemini API:', aiErr);
      res.status(500).json({ error: 'AI evaluation failed.' });
    }
  } catch (error) {
    console.error('AI evaluation failed:', error);
    res.status(500).json({ error: 'AI evaluation failed.' });
  }
});

// POST /api/goals/recommend-ppl - AI PPL 訓練課表推薦
router.post('/recommend-ppl', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { experience } = req.body;
    const validExp = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    if (!experience || !validExp.includes(experience)) {
      return res.status(400).json({ error: 'Experience level must be BEGINNER, INTERMEDIATE, or ADVANCED.' });
    }

    const layout = await prisma.gymLayout.findFirst({
      include: { equipment: true }
    });
    if (!layout) {
      return res.status(404).json({ error: 'Gym layout not found.' });
    }

    try {
      const pplPlan = await generatePPLPlan(layout.equipment, experience);
      res.json(pplPlan);
    } catch (aiErr) {
      console.error('Failed to generate PPL plan using Gemini API:', aiErr);
      res.status(500).json({ error: 'AI PPL generation failed.' });
    }
  } catch (error) {
    console.error('Failed to recommend PPL plan:', error);
    res.status(500).json({ error: 'Failed to recommend PPL plan.' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();
const PROFILE_ID = 'default-user-profile';

interface UpdateProfilePayload {
  height?: number | null;
  weight?: number | null;
  birthdate?: string | null;
  experience?: string | null;
  fitnessGoal?: string | null;
}

// GET /api/profile
router.get('/', async (req: Request, res: Response) => {
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
router.put('/', async (req: Request, res: Response) => {
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

export default router;

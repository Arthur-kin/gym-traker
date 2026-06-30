import { prisma } from '../prisma';

// Helper to update progress of all active goals and challenges based on workout logs
export async function updateGoalsProgress(): Promise<void> {
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

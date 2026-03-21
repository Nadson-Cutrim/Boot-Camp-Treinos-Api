import { ConflictError, ForbiddenError, NotFoundError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
}

interface OutputDto {
  workoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new ForbiddenError("You are not the owner of this workout plan");
    }

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError();
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: dto.workoutDayId },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    if (workoutDay.workoutPlanId !== dto.workoutPlanId) {
      throw new NotFoundError("Workout day does not belong to this workout plan");
    }

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: dto.workoutDayId,
        completedAt: null,
      },
    });

    if (existingSession) {
      throw new ConflictError("A session for this workout day is already in progress");
    }

    const workoutSession = await prisma.workoutSession.create({
      data: {
        id: crypto.randomUUID(),
        workoutDayId: dto.workoutDayId,
        startedAt: new Date(),
      },
    });

    return {
      workoutSessionId: workoutSession.id,
    };
  }
}
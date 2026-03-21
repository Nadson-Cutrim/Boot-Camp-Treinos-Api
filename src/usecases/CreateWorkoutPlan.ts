import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface ExerciseInputDto {
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
}

interface WorkoutDayInputDto {
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  coverImageUrl?: string;
  estimatedDurationInSeconds: number;
  exercises: Array<ExerciseInputDto>;
}

interface InputDto {
  userId: string;
  name: string;
  workoutDays: Array<WorkoutDayInputDto>;
}

interface ExerciseOutputDto {
  id: string;
  order: number;
  name: string;
  sets: number;
  reps: number;
  restTimeInSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkoutDayOutputDto {
  id: string;
  name: string;
  weekDay: WeekDay;
  isRest: boolean;
  coverImageUrl: string | null;
  estimatedDurationInSeconds: number;
  exercises: Array<ExerciseOutputDto>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutputDto {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  workoutDays: Array<WorkoutDayOutputDto>;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateWorkoutPlan {
  async execute(dto: InputDto): Promise<OutputDto> {
    const existingWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        isActive: true,
      },
    });
    //Transaction - Atomicidade - Garantir que o plano de treino seja criado e o plano de treino antigo seja desativado em uma única operação atômica
    return prisma.$transaction(async (tx) => {
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: {
            id: existingWorkoutPlan.id,
          },
          data: {
            isActive: false,
          },
        });
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          id: crypto.randomUUID(),
          userId: dto.userId,
          name: dto.name,
          isActive: true,
          workoutDays: {
            create: dto.workoutDays.map((workoutDay) => ({
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              isRest: workoutDay.isRest,
              coverImageUrl: workoutDay.coverImageUrl,
              estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
              exercises: {
                create: workoutDay.exercises.map((exercise) => ({
                  order: exercise.order,
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: exercise.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });
      const result = await tx.workoutPlan.findUnique({
        where: { id: workoutPlan.id },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            },
          },
        },
      });
      if (!result) {
        throw new NotFoundError("Workout plan not found");
      }
      return result;
    });
  } 
}

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  date: string; // YYYY-MM-DD
}

interface TodayWorkoutDay {
  workoutPlanId: string;
  id: string;
  name: string;
  isRest: boolean;
  weekDay: string;
  estimatedDurationInSeconds: number;
  coverImageUrl?: string;
  exercisesCount: number;
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: TodayWorkoutDay;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
}

const WEEK_DAYS_ORDER = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export class GetHome {
  async execute(dto: InputDto): Promise<OutputDto> {
    // Parse the date
    const currentDate = dayjs.utc(dto.date);

    // Calculate week boundaries (Sunday to Saturday in UTC)
    const weekStartDate = currentDate.startOf("week");
    const weekEndDate = weekStartDate.endOf("week");

    // Find active workout plan
    const workoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError("No active workout plan found");
    }

    // Find today's workout day
    const dayOfWeek = WEEK_DAYS_ORDER[currentDate.day()];
    const todayWorkoutDay = workoutPlan.workoutDays.find(
      (day) => day.weekDay === dayOfWeek,
    );

    if (!todayWorkoutDay) {
      throw new NotFoundError("No workout day found for today");
    }

    // Fetch all workout sessions for this week
    const weeklySessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlanId: workoutPlan.id,
        },
        startedAt: {
          gte: weekStartDate.toDate(),
          lte: weekEndDate.toDate(),
        },
      },
      include: {
        workoutDay: true,
      },
    });

    // Group sessions by date (YYYY-MM-DD format)
    const sessionsByDate: Record<
      string,
      {
        completed: number;
        started: number;
      }
    > = {};

    for (const session of weeklySessions) {
      const sessionDate = dayjs(session.startedAt).format("YYYY-MM-DD");

      if (!sessionsByDate[sessionDate]) {
        sessionsByDate[sessionDate] = { completed: 0, started: 0 };
      }

      sessionsByDate[sessionDate].started += 1;

      if (session.completedAt) {
        sessionsByDate[sessionDate].completed += 1;
      }
    }

    // Build consistency map for all 7 days of the week
    const consistencyByDay: Record<
      string,
      {
        workoutDayCompleted: boolean;
        workoutDayStarted: boolean;
      }
    > = {};

    for (let i = 0; i < 7; i++) {
      const dayDate = weekStartDate.add(i, "day").format("YYYY-MM-DD");
      const dayData = sessionsByDate[dayDate];

      consistencyByDay[dayDate] = {
        workoutDayCompleted: (dayData?.completed ?? 0) > 0,
        workoutDayStarted: (dayData?.started ?? 0) > 0,
      };
    }

    // Calculate workout streak
    let workoutStreak = 0;

    // Get workout plan's workout days in order
    const workoutDaysInPlan = workoutPlan.workoutDays.sort((a, b) => {
      return (
        WEEK_DAYS_ORDER.indexOf(a.weekDay) - WEEK_DAYS_ORDER.indexOf(b.weekDay)
      );
    });

    // Count completed consecutive workouts from today backwards
    let currentCheckDate = dayjs(dto.date);
    for (let i = 0; i < workoutDaysInPlan.length; i++) {
      const dateStr = currentCheckDate.format("YYYY-MM-DD");
      const dayOfWeekCheck = WEEK_DAYS_ORDER[currentCheckDate.day()];

      const workoutDayForDate = workoutDaysInPlan.find(
        (day) => day.weekDay === dayOfWeekCheck,
      );

      if (!workoutDayForDate) {
        break;
      }

      const sessionData = sessionsByDate[dateStr];
      if (sessionData?.completed === 0 && sessionData?.started === 0) {
        break;
      }

      workoutStreak += 1;
      currentCheckDate = currentCheckDate.subtract(1, "day");
    }

    return {
      activeWorkoutPlanId: workoutPlan.id,
      todayWorkoutDay: {
        workoutPlanId: todayWorkoutDay.workoutPlanId,
        id: todayWorkoutDay.id,
        name: todayWorkoutDay.name,
        isRest: todayWorkoutDay.isRest,
        weekDay: todayWorkoutDay.weekDay,
        estimatedDurationInSeconds: todayWorkoutDay.estimatedDurationInSeconds,
        coverImageUrl: todayWorkoutDay.coverImageUrl ?? undefined,
        exercisesCount: todayWorkoutDay.exercises.length,
      },
      workoutStreak,
      consistencyByDay,
    };
  }
}

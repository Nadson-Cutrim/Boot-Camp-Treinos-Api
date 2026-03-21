import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { prisma } from "../lib/db.js";

dayjs.extend(utc);

interface InputDto {
  userId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const fromDate = dayjs.utc(dto.from);
    const toDate = dayjs.utc(dto.to);

    // Fetch all workout sessions for the user within the date range
    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: fromDate.toDate(),
          lte: toDate.add(1, "day").toDate(),
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
        totalTimeInSeconds: number;
      }
    > = {};

    let completedWorkoutsCount = 0;
    let totalTimeInSeconds = 0;

    for (const session of sessions) {
      const sessionDate = dayjs(session.startedAt).format("YYYY-MM-DD");

      // Skip sessions outside the range
      if (
        dayjs(sessionDate).isBefore(fromDate) ||
        dayjs(sessionDate).isAfter(toDate)
      ) {
        continue;
      }

      if (!sessionsByDate[sessionDate]) {
        sessionsByDate[sessionDate] = {
          completed: 0,
          started: 0,
          totalTimeInSeconds: 0,
        };
      }

      sessionsByDate[sessionDate].started += 1;

      if (session.completedAt) {
        sessionsByDate[sessionDate].completed += 1;
        completedWorkoutsCount += 1;

        const sessionDurationInSeconds = Math.floor(
          (new Date(session.completedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            1000,
        );
        sessionsByDate[sessionDate].totalTimeInSeconds +=
          sessionDurationInSeconds;
        totalTimeInSeconds += sessionDurationInSeconds;
      }
    }

    // Build consistency map for dates with sessions
    const consistencyByDay: Record<
      string,
      {
        workoutDayCompleted: boolean;
        workoutDayStarted: boolean;
      }
    > = {};

    for (const [date, data] of Object.entries(sessionsByDate)) {
      consistencyByDay[date] = {
        workoutDayCompleted: data.completed > 0,
        workoutDayStarted: data.started > 0,
      };
    }

    // Calculate workout streak (consecutive completed workouts from the last date backwards)
    let workoutStreak = 0;

    const sessionsDatesSorted = Object.keys(sessionsByDate).sort().reverse();

    if (sessionsDatesSorted.length > 0) {
      let currentCheckDate = dayjs(sessionsDatesSorted[0]);

      for (const dateStr of sessionsDatesSorted) {
        const checkDate = dayjs(dateStr);
        const dayData = sessionsByDate[dateStr];

        // Check if there's a gap of more than 1 day
        if (checkDate.isBefore(currentCheckDate.subtract(1, "day"))) {
          break;
        }

        if (dayData.completed > 0) {
          workoutStreak += 1;
          currentCheckDate = checkDate;
        } else if (dayData.started > 0) {
          // Only count started but not completed if it's part of the streak
          currentCheckDate = checkDate;
        } else {
          break;
        }
      }
    }

    // Calculate conclusion rate
    const totalSessions = sessions.filter((s) => {
      const sessionDate = dayjs(s.startedAt).format("YYYY-MM-DD");
      return (
        !dayjs(sessionDate).isBefore(fromDate) &&
        !dayjs(sessionDate).isAfter(toDate)
      );
    }).length;

    const conclusionRate =
      totalSessions > 0 ? completedWorkoutsCount / totalSessions : 0;

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate: Math.round(conclusionRate * 100) / 100,
      totalTimeInSeconds,
    };
  }
}

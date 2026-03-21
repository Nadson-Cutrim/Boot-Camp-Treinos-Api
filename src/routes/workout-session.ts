import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { ConflictError, ForbiddenError, NotFoundError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, StartWorkoutSessionSchema } from "../schemas/index.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";

export const workoutSessionRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:workoutPlanId/days/:workoutDayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session",
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        201: StartWorkoutSessionSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (req, rep) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!session) {
          return rep.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED",
          });
        }
        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: req.params.workoutPlanId,
          workoutDayId: req.params.workoutDayId,
        });
        return rep.status(201).send(result);
      } catch (error) {
        app.log.error(error);
        if (error instanceof NotFoundError) {
          return rep.status(404).send({
            error: error.message,
            code: "NOT_FOUND",
          });
        }
        if (error instanceof ForbiddenError) {
          return rep.status(403).send({
            error: error.message,
            code: "FORBIDDEN",
          });
        }
        if (error instanceof WorkoutPlanNotActiveError) {
          return rep.status(403).send({
            error: error.message,
            code: "WORKOUT_PLAN_NOT_ACTIVE",
          });
        }
        if (error instanceof ConflictError) {
          return rep.status(409).send({
            error: error.message,
            code: "CONFLICT",
          });
        }
        return rep.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
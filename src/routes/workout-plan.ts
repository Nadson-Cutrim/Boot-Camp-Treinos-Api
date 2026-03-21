import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { ForbiddenError, NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import {
  ErrorSchema,
  GetWorkoutDaySchema,
  GetWorkoutPlanSchema,
  GetWorkoutPlansSchema,
  WorkoutPlanSchema,
} from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { GetWorkoutDay } from "../usecases/GetWorkoutDay.js";
import { GetWorkoutPlan } from "../usecases/GetWorkoutPlan.js";
import { GetWorkoutPlans } from "../usecases/GetWorkoutPlans.js";

export const workoutPlanRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a workout plan",
      body: WorkoutPlanSchema.omit({ id: true }).partial(),
      response: {
        201: WorkoutPlanSchema,
        401: ErrorSchema,
        404: ErrorSchema,
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
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: req.body.name,
          workoutDays: req.body.workoutDays,
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
        return rep.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "List workout plans with optional active filter",
      querystring: z.object({
        active: z.enum(["true", "false"]).optional(),
      }),
      response: {
        200: GetWorkoutPlansSchema,
        401: ErrorSchema,
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
        const getWorkoutPlans = new GetWorkoutPlans();
        const result = await getWorkoutPlans.execute({
          userId: session.user.id,
          active: req.query.active ? req.query.active === "true" : undefined,
        });
        return rep.status(200).send(result);
      } catch (error) {
        app.log.error(error);
        return rep.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:workoutPlanId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get a workout plan",
      params: z.object({
        workoutPlanId: z.uuid(),
      }),
      response: {
        200: GetWorkoutPlanSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
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
        const getWorkoutPlan = new GetWorkoutPlan();
        const result = await getWorkoutPlan.execute({
          userId: session.user.id,
          workoutPlanId: req.params.workoutPlanId,
        });
        return rep.status(200).send(result);
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
        return rep.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:workoutPlanId/days/:workoutDayId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get a workout day with exercises and sessions",
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        200: GetWorkoutDaySchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
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
        const getWorkoutDay = new GetWorkoutDay();
        const result = await getWorkoutDay.execute({
          userId: session.user.id,
          workoutPlanId: req.params.workoutPlanId,
          workoutDayId: req.params.workoutDayId,
        });
        return rep.status(200).send(result);
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
        return rep.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};

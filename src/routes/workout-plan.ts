import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, WorkoutPlanSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";

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
};


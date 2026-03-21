import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "../lib/auth.js";
import { ErrorSchema, GetStatsSchema } from "../schemas/index.js";
import { GetStats } from "../usecases/GetStats.js";

export const statsRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Stats"],
      summary: "Get workout statistics for a date range",
      querystring: z.object({
        from: z.string().date(),
        to: z.string().date(),
      }),
      response: {
        200: GetStatsSchema,
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
        const getStats = new GetStats();
        const result = await getStats.execute({
          userId: session.user.id,
          from: req.query.from,
          to: req.query.to,
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
};

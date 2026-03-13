import "dotenv/config";

import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

const app = Fastify({
  logger: true,
});
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Boot Camp Treinos API",
      description: "API para gerenciamento de treinos e exercícios",
      version: "1.0.0",
    },
    servers:[{
      description: "Localhost",
      url: "http://localhost:3000",
    }],
  },
  transform: jsonSchemaTransform,
  
});
await app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});


app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello world",
    tags: ["Hello"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello world",
    };
  },
});
const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
start();

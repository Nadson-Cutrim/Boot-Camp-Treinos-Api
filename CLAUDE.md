# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript Fastify API for workout plan management with authentication. Users can create workout plans with days and exercises.

## Commands

```bash
pnpm dev              # Start development server with watch mode
pnpm prisma generate  # Generate Prisma client (outputs to src/generated/prisma)
pnpm prisma migrate dev --name <name>  # Create and apply migration
pnpm prisma db push   # Push schema changes without migration
npx eslint . --fix    # Lint and auto-fix
npx prettier . --write # Format code
```

## Database

PostgreSQL via Docker Compose. Start with `docker compose up -d`. The database runs on port 5432 with credentials in `docker-compose.yml`.

After schema changes in `prisma/schema.prisma`, run `pnpm prisma generate` to update the generated client in `src/generated/prisma/`.

## Architecture

```
src/
├── index.ts           # Fastify app setup, routes registration, auth handler
├── lib/
│   ├── auth.ts        # Better Auth configuration
│   └── db.ts          # Prisma client singleton
├── routes/            # Fastify route handlers (one file per domain)
├── schemas/           # Zod schemas for request/response validation
├── usecases/          # Business logic classes with execute() method
├── errors/            # Custom error classes
└── generated/prisma/  # Generated Prisma types and client
```

### Patterns

- **Use Case Classes**: Business logic lives in `src/usecases/` as classes with an `execute()` method. Routes call use cases, use cases call Prisma.
- **Validation**: Zod schemas in `src/schemas/` are used with `fastify-type-provider-zod` for request/response typing.
- **Authentication**: Better Auth handles sessions. Routes get sessions via `auth.api.getSession({ headers })` and extract `session.user.id`.
- **Prisma Transactions**: Use `$transaction()` for atomic operations (see `CreateWorkoutPlan`).
- **Import Sorting**: ESLint enforces `simple-import-sort/imports`. Run `--fix` before commits.

### Database Models

- `User` - Auth user (Better Auth)
- `WorkoutPlan` - A workout plan with `workoutDays`
- `WorkoutDay` - A day in a plan with `weekDay`, `exercises`, `isRest`
- `WorkoutExercise` - An exercise with `sets`, `reps`, `restTimeInSeconds`
- `WorkoutSession` - Tracks workout completion
- `Session`, `Account`, `Verification` - Better Auth tables

## API Documentation

Swagger UI available at `/docs`. Routes use OpenAPI tags for grouping.

## Environment Variables

Required in `.env`:
- `PORT` - Server port (default 8080)
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_URL` - Auth server URL
- `BETTER_AUTH_SECRET` - Auth secret key
# Migration to Prisma + tRPC

This application has been migrated to use:
- **Prisma** with Cloudflare D1 adapter for type-safe database access
- **tRPC** for end-to-end type-safe APIs

## Key Changes

### Database Layer
- Replaced raw SQL queries with Prisma ORM
- Using Cloudflare D1 as the database with Prisma adapter
- Type-safe database schema with migrations

### API Layer
- Replaced REST API routes with tRPC procedures
- Full type safety from backend to frontend
- Automatic type inference and validation with Zod

### Frontend
- Updated all API calls to use tRPC hooks
- Better error handling and loading states
- Automatic query invalidation on mutations

## Setup Instructions

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Create D1 database** (if not already created):
   ```bash
   wrangler d1 create insulin-tracker
   ```

3. **Run database migrations**:
   ```bash
   pnpm run db:migrate
   ```

4. **Generate Prisma client**:
   ```bash
   pnpm run db:generate
   ```

5. **Development**:
   ```bash
   pnpm run dev
   ```

6. **Deploy**:
   ```bash
   pnpm run deploy
   ```

## File Structure Changes

- `/src/server/` - New directory for backend code
  - `trpc.ts` - tRPC initialization
  - `db.ts` - Prisma client setup
  - `routers/` - tRPC routers
  - `schemas/` - Zod validation schemas
- `/src/trpc/` - Frontend tRPC setup
  - `client.ts` - tRPC client
  - `provider.tsx` - React Query provider
- `/prisma/` - Prisma schema
- `/migrations/` - Database migrations

## Benefits

1. **Type Safety**: Full type safety from database to UI
2. **Developer Experience**: Auto-completion and type checking
3. **Performance**: Optimized queries with Prisma
4. **Maintainability**: Clear separation of concerns
5. **Validation**: Automatic input validation with Zod
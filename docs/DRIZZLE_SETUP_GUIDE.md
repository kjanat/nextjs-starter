# Drizzle ORM Setup Guide

This guide covers setting up Drizzle ORM with Cloudflare D1 for the Insulin Injection Tracker.

## Overview

The application uses Drizzle ORM for database operations with Cloudflare D1 as the SQLite database. This provides:

- Native edge compatibility with Cloudflare Workers
- Type-safe database queries
- Minimal bundle size (~50KB vs ~250KB with Prisma)
- Fast cold starts on edge runtime

## Initial Setup

### 1. Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd next-starter-template

# Install dependencies
pnpm install
```

### 2. Configure Environment

Create `.env.local` with your Cloudflare credentials:

```env
# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-d1-database-id
CLOUDFLARE_D1_TOKEN=your-d1-api-token  # Optional for local development
```

### 3. Create D1 Database

```bash
# Create a D1 database in Cloudflare
wrangler d1 create insulin-tracker

# Note the database_id from the output
# Add it to wrangler.toml
```

### 4. Configure wrangler.toml

```toml
name = "insulin-tracker"
main = ".cloudflare/next-adapter/worker.mjs"
compatibility_date = "2024-09-26"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = ".cloudflare/next-adapter/static"

[[d1_databases]]
binding = "DB"
database_name = "insulin-tracker"
database_id = "your-database-id-here"
```

## Database Schema

### Schema Definition

The schema is defined in `src/db/schema/injection.ts`:

```typescript
export const injections = sqliteTable("injections", {
  id: text("id").primaryKey().$defaultFn(() => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `c${timestamp}${random}`;
  }),
  userName: text("user_name").notNull(),
  injectionTime: integer("injection_time", { mode: "timestamp" }).notNull(),
  injectionType: text("injection_type").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});
```

### Generate Migrations

```bash
# Generate SQL migrations from schema
pnpm drizzle:generate

# This creates migration files in drizzle/
```

### Apply Migrations

```bash
# For local development
wrangler d1 execute insulin-tracker --local --file=./drizzle/0000_initial.sql

# For remote D1 database
wrangler d1 migrations apply insulin-tracker --remote
```

## Development Workflow

### 1. Local Development

```bash
# Start the development server
pnpm dev

# In another terminal, run Wrangler for D1 emulation
pnpm wrangler pages dev .next --d1=DB --persist
```

### 2. Database Client

The database client is configured in `src/db/client.ts`:

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDrizzleClient(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

### 3. Using in API Routes

Example usage in tRPC procedures:

```typescript
import { createDrizzleClient } from "@/db/client";
import { injections } from "@/db/schema/injection";

// In your tRPC context
const db = createDrizzleClient(env.DB);

// Query example
const results = await db
  .select()
  .from(injections)
  .where(eq(injections.userName, "John"))
  .orderBy(desc(injections.injectionTime));

// Insert example
await db.insert(injections).values({
  userName: "John",
  injectionTime: new Date(),
  injectionType: "morning",
  notes: "Before breakfast"
});
```

## Common Commands

### Database Operations

```bash
# Generate migrations from schema changes
pnpm drizzle:generate

# Push schema directly to D1 (development)
pnpm drizzle:push

# Open Drizzle Studio (database GUI)
pnpm drizzle:studio

# Check schema for issues
pnpm drizzle:check
```

### Development

```bash
# Start development server
pnpm dev

# Type checking
pnpm check

# Linting
pnpm lint

# Run tests
pnpm test
```

### Deployment

```bash
# Build for production
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy

# Preview deployment
pnpm preview
```

## Schema Management

### Adding New Tables

1. Create a new schema file in `src/db/schema/`:

```typescript
// src/db/schema/user.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

2. Export from index:

```typescript
// src/db/schema/index.ts
export * from "./injection";
export * from "./user";
```

3. Generate and apply migrations:

```bash
pnpm drizzle:generate
wrangler d1 migrations apply insulin-tracker --remote
```

### Modifying Existing Tables

1. Update the schema file
2. Generate a new migration
3. Review the generated SQL
4. Apply to D1

**Note**: D1 has limited ALTER TABLE support. For complex changes, you may need to:
- Create a new table
- Copy data
- Drop old table
- Rename new table

## Best Practices

### 1. Type Safety

Always use Drizzle's type inference:

```typescript
// Good: Type-safe
const result = await db.select().from(injections);
// result is typed as Injection[]

// Use schema types
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

type Injection = InferSelectModel<typeof injections>;
type NewInjection = InferInsertModel<typeof injections>;
```

### 2. Query Optimization

```typescript
// Use select specific columns
const names = await db
  .select({ userName: injections.userName })
  .from(injections);

// Use indexes (defined in schema)
// Queries on indexed columns are faster
```

### 3. Error Handling

```typescript
try {
  await db.insert(injections).values(data);
} catch (error) {
  if (error.message.includes("UNIQUE constraint")) {
    // Handle duplicate key
  }
  throw error;
}
```

### 4. Transactions

```typescript
// D1 supports transactions
await db.transaction(async (tx) => {
  await tx.insert(injections).values(injection1);
  await tx.insert(injections).values(injection2);
  // Both succeed or both fail
});
```

## Troubleshooting

### "D1 binding not found"

Ensure your wrangler.toml has the correct binding:

```toml
[[d1_databases]]
binding = "DB"  # This must match your code
```

### "No such table"

Run migrations:

```bash
wrangler d1 migrations apply insulin-tracker --remote
```

### Type Errors

Regenerate types after schema changes:

```bash
pnpm drizzle:generate
```

Restart TypeScript server in VS Code:
- Cmd/Ctrl + Shift + P
- "TypeScript: Restart TS Server"

### Performance Issues

1. Check indexes in schema
2. Use `select()` with specific columns
3. Avoid N+1 queries - use joins
4. Monitor with `pnpm wrangler tail`

## Production Considerations

### 1. Migrations

Always test migrations in staging:

```bash
# Apply to staging first
wrangler d1 migrations apply insulin-tracker-staging --remote

# Test thoroughly
# Then apply to production
wrangler d1 migrations apply insulin-tracker --remote
```

### 2. Backups

Regular backups using Wrangler:

```bash
# Export data
wrangler d1 export insulin-tracker --remote > backup.sql
```

### 3. Monitoring

- Check Cloudflare dashboard for D1 metrics
- Monitor query performance
- Set up alerts for errors

## Resources

- [Drizzle Documentation](https://orm.drizzle.team)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## Support

For issues:

1. Check D1 database status in Cloudflare dashboard
2. Review migrations in `drizzle/` directory
3. Verify environment variables
4. Check wrangler.toml configuration
5. Review error logs with `wrangler tail`
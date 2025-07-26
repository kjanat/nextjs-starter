# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Insulin Injection Tracker is a production application built with Next.js 15 and deployed on Cloudflare Workers. It helps users track their daily insulin injections (morning and evening doses), view injection history, and analyze compliance statistics with multi-user support.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Cloudflare Workers
- **Adapter**: OpenNext Cloudflare
- **Language**: TypeScript 5.x
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm
- **Node Version**: 18.x or higher

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm run dev

# Production build
pnpm run build

# Type checking
pnpm run check   # Runs build + tsc

# Linting
pnpm run lint

# Deploy to Cloudflare
pnpm run deploy  # Builds with OpenNext and deploys

# Preview locally before deploy
pnpm run preview

# Generate Cloudflare types
pnpm run cf-typegen
```

## Project Structure

```
.
├── src/
│   ├── app/                    # Next.js App Router pages and layouts
│   │   ├── api/               # API endpoints
│   │   │   └── injections/    # Injection tracking endpoints
│   │   │       ├── route.ts   # CRUD operations for injections
│   │   │       ├── stats/     # Statistics endpoint
│   │   │       └── today/     # Today's status endpoint
│   │   ├── history/           # History page
│   │   │   └── page.tsx      # View injection history by date
│   │   ├── stats/             # Statistics page
│   │   │   └── page.tsx      # View compliance statistics
│   │   ├── favicon.ico        # App favicon
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Main dashboard (home page)
│   ├── components/            # React components
│   │   ├── InjectionCard.tsx  # Card for displaying injection status
│   │   └── StatCard.tsx       # Card for displaying statistics
│   ├── hooks/                 # Custom React hooks
│   │   └── useTodayStatus.ts  # Hook for fetching today's injection status
│   ├── lib/                   # Utility functions and shared code
│   │   ├── constants.ts       # App constants (injection types, etc.)
│   │   ├── utils.ts          # Date/time formatting utilities
│   │   └── validation.ts      # Input validation schemas
│   └── types/                 # TypeScript type definitions
│       └── injection.ts       # Injection-related types
├── public/                    # Static assets
├── .cloudflare/              # Cloudflare build output (git-ignored)
├── open-next.config.ts       # OpenNext Cloudflare adapter configuration
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── package.json              # Project dependencies and scripts
└── wrangler.toml             # Cloudflare Workers configuration
```

## Architecture

- **Framework**: Next.js 15 with App Router
- **Deployment**: Cloudflare Workers via OpenNext adapter
- **Styling**: Tailwind CSS 4 with PostCSS
- **Type Safety**: TypeScript with strict mode enabled
- **Path Alias**: `@/*` maps to `./src/*`

The OpenNext Cloudflare adapter transforms Next.js build output to run on Cloudflare Workers. Configuration is in `open-next.config.ts`.

## Key Configurations

- **TypeScript**: Target ES6, strict mode enabled, module resolution bundler
- **ESLint**: Next.js core-web-vitals and TypeScript configurations
- **OpenNext**: Development mode integration enabled in `next.config.ts`
- **Tailwind**: Using v4 with @tailwindcss/postcss plugin

## Development Guidelines

### Component Development

- Use functional components with TypeScript
- Prefer Server Components by default, use Client Components only when needed
- Keep components small and focused on a single responsibility
- Use descriptive names for components and props

### State Management

- Use React's built-in hooks (useState, useReducer) for local state
- For global state, consider using React Context or a state management library
- Server Components can fetch data directly in the component

### Styling

- Use Tailwind CSS utility classes for styling
- Avoid inline styles unless absolutely necessary
- Use CSS modules for component-specific styles when Tailwind isn't sufficient
- Follow mobile-first responsive design principles

### TypeScript

- Always define proper types for props, state, and function parameters
- Avoid using `any` type - use `unknown` if type is truly unknown
- Export types/interfaces that might be used by other components
- Use type inference where possible to reduce verbosity

### File Organization

- Keep related files close together
- Use barrel exports (index.ts) for cleaner imports
- Group components by feature or domain
- Place utility functions in the `lib` directory

### Performance

- Use dynamic imports for code splitting when appropriate
- Optimize images using Next.js Image component
- Implement proper loading states
- Use React.memo() for expensive components when needed

### Cloudflare-Specific Considerations

- Be aware of Cloudflare Workers limitations (CPU time, memory)
- Use Cloudflare services (KV, R2, D1) through bindings when needed
- Test edge cases with the preview deployment
- Consider using Cloudflare's caching capabilities

### Testing & Quality

- Run type checking before committing: `pnpm run check`
- Fix linting issues: `pnpm run lint`
- Test production build locally: `pnpm run preview`
- Always test on both development and production environments

## Application Features

### Core Functionality

- **Daily Injection Tracking**: Track morning and evening insulin injections
- **User Identification**: Simple name-based tracking for multiple users
- **History View**: Browse injection history by date
- **Statistics Dashboard**: View compliance rates and user contributions
- **Real-time Status**: Check today's injection status at a glance

### API Endpoints

- `GET /api/injections` - Fetch injections (with optional date filter)
- `POST /api/injections` - Log a new injection
- `GET /api/injections/today` - Get today's injection status
- `GET /api/injections/stats` - Get statistics and compliance data

## Common Tasks

### Adding a New Page

Create a new directory in `src/app/` with a `page.tsx` file.

### Adding API Routes

Create a `route.ts` file in the appropriate directory under `src/app/api/`.

### Working with Injections

The app uses a simple injection tracking system:

- Types: "morning" or "evening"
- Required fields: user_name, injection_time, injection_type
- Optional fields: notes

### Using Environment Variables

- Development: Use `.env.local`
- Production: Configure in Cloudflare dashboard or wrangler.toml

### Database Considerations

The current implementation should be connected to a database (e.g., Cloudflare D1) for persistent storage. The API routes are designed to work with a database schema containing injections table.

### Debugging

- Use browser DevTools for client-side debugging
- Check Cloudflare Workers logs in the dashboard
- Use `console.log` strategically (remove before production)

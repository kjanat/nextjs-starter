# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application deployed on Cloudflare Workers using OpenNext Cloudflare adapter. The project uses TypeScript, React 19, and Tailwind CSS 4.

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

## Architecture

- **Framework**: Next.js 15 with App Router
- **Deployment**: Cloudflare Workers via OpenNext adapter
- **Styling**: Tailwind CSS 4
- **Type Safety**: TypeScript with strict mode enabled
- **Path Alias**: `@/*` maps to `./src/*`

The OpenNext Cloudflare adapter transforms Next.js build output to run on Cloudflare Workers. Configuration is in `open-next.config.ts`.

## Key Configurations

- **TypeScript**: Target ES6, strict mode enabled
- **ESLint**: Next.js core-web-vitals and TypeScript configurations
- **OpenNext**: Development mode integration enabled in `next.config.ts`
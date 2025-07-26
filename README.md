# 🐕 Insulin Tracker

A modern insulin injection tracking application built with Next.js 15 and deployed on Cloudflare Workers. Track daily insulin injections, view history, and analyze compliance statistics with multi-user support.

Built using [OpenNext](https://opennext.js.org/) via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) for optimal edge performance.

## ✨ Features

### Application Features

- **📊 Daily Injection Tracking** - Track morning and evening insulin doses
- **👥 Multi-User Support** - Simple name-based tracking for families
- **📅 History View** - Browse injection history by date
- **📈 Statistics Dashboard** - View compliance rates and user contributions
- **🔄 Real-time Updates** - Check today's injection status instantly
- **🏆 Gamification** - See top contributors and track streaks

### Technical Features

- **Next.js 15** with App Router for modern React applications
- **Cloudflare Workers** deployment for edge computing
- **TypeScript** for type-safe development
- **React 19** with Server Components
- **Tailwind CSS 4** for utility-first styling
- **pnpm** for fast, efficient package management
- **ESLint** and **TypeScript** strict mode for code quality
- **OpenNext Cloudflare Adapter** for seamless deployment

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📦 Available Scripts

| Command               | Description                      |
| :-------------------- | :------------------------------- |
| `pnpm run dev`        | Start the development server     |
| `pnpm run build`      | Build for production             |
| `pnpm run preview`    | Preview production build locally |
| `pnpm run deploy`     | Deploy to Cloudflare Workers     |
| `pnpm run check`      | Run build and TypeScript checks  |
| `pnpm run lint`       | Run ESLint                       |
| `pnpm run cf-typegen` | Generate Cloudflare types        |

## 🏗️ Project Structure

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   │   └── injections/    # Injection tracking endpoints
│   │   │       ├── route.ts   # CRUD operations
│   │   │       ├── stats/     # Statistics endpoint
│   │   │       └── today/     # Today's status endpoint
│   │   ├── history/           # History page
│   │   ├── stats/             # Statistics page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main dashboard
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── InjectionCard.tsx  # Injection status cards
│   │   └── StatCard.tsx       # Statistics cards
│   ├── hooks/                 # Custom React hooks
│   │   └── useTodayStatus.ts  # Today's status hook
│   ├── lib/                   # Utilities and helpers
│   │   ├── constants.ts       # App constants
│   │   ├── utils.ts          # Date/time utilities
│   │   └── validation.ts      # Input validation
│   └── types/                 # TypeScript types
│       └── injection.ts       # Domain types
├── public/                    # Static assets
├── open-next.config.ts        # OpenNext configuration
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── wrangler.toml              # Cloudflare Workers config
└── package.json               # Dependencies and scripts
```

## 🛠️ Configuration

### Environment Variables

- **Development**: Create a `.env.local` file
- **Production**: Configure in Cloudflare dashboard or `wrangler.toml`

### TypeScript

Strict mode is enabled by default. Configuration in `tsconfig.json`:

- Target: ES6
- Module Resolution: Bundler
- Path Alias: `@/*` → `./src/*`

### Tailwind CSS

Using Tailwind CSS v4 with PostCSS. Configuration in `tailwind.config.ts`.

## 🚀 Deployment

### Deploy to Cloudflare Workers

```bash
# Build and deploy in one command
pnpm run deploy

# Or step by step:
pnpm run build
pnpm run deploy
```

### Preview Deployment

Before deploying to production, preview your build:

```bash
pnpm run preview
```

## 🌐 Deployment

Deploy your insulin tracker to Cloudflare Workers for global edge performance.

## 💡 Development Tips

### Application Pages

The app includes three main pages:

1. **Dashboard** (`/`) - Track daily injections
2. **History** (`/history`) - View past injection records
3. **Statistics** (`/stats`) - Analyze compliance and contributions

### API Endpoints

The app provides several API endpoints:

```typescript
// Get injections (with optional date filter)
GET /api/injections?date=2024-01-15

// Log a new injection
POST /api/injections
{
  "user_name": "John",
  "injection_time": "2024-01-15T08:00:00Z",
  "injection_type": "morning",
  "notes": "Before breakfast"
}

// Get today's status
GET /api/injections/today

// Get statistics
GET /api/injections/stats
```

### Database Setup

To use this app, you'll need to set up a database (recommended: Cloudflare D1):

```sql
CREATE TABLE injections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  injection_time TEXT NOT NULL,
  injection_type TEXT NOT NULL CHECK (injection_type IN ('morning', 'evening')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Using Cloudflare Bindings

Access Cloudflare services (KV, R2, D1) through bindings:

```tsx
// In your API route
export async function GET(request: Request, { env }) {
  const db = env.DB; // Cloudflare D1 binding
  const results = await db.prepare("SELECT * FROM injections").all();
  return Response.json(results);
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Build failures**: Run `pnpm run check` to identify TypeScript errors
2. **Deployment issues**: Check `wrangler.toml` configuration
3. **Runtime errors**: View logs in Cloudflare dashboard

### Debug Mode

Enable debug logging:

```bash
DEBUG=* pnpm run dev
```

## 📚 Learn More

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub Repository](https://github.com/vercel/next.js/)

### Cloudflare Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [OpenNext Documentation](https://opennext.js.org/)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

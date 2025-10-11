# QuickBuck 💰

**A multiplayer business simulation game where you build companies, create products, trade stocks, and compete for wealth.**

QuickBuck is a realistic business simulator combining company management, stock trading, product marketplaces, and strategic competition. Build your empire from the ground up!

## 🎮 Game Features

### Business Building
- 🏢 **Create Companies** - Build and manage multiple businesses
- 📦 **Product Development** - Design and price products strategically
- 💼 **Financial Management** - Track revenue, costs, and profits
- 📊 **Analytics Dashboard** - Real-time business metrics

### Stock Market
- 📈 **Public Trading** - IPO when company reaches $50K
- � **Dynamic Pricing** - Supply and demand-based pricing
- 🤝 **Shareholder Dividends** - Distribute profits to investors
- 📉 **Portfolio Management** - Diversify investments

### Marketplace & Collections
- � **Product Marketplace** - Buy products from other companies
- 🎨 **Collection System** - Build valuable product portfolios
- � **Asset Appreciation** - Track collection value over time

### Casino & Gaming
- 🎰 **Slot Machines** - Test your luck with various payouts
- � **Blackjack** - Strategic card game with 50/50 fairness
- 🎲 **Roulette** - Bet on colors or numbers

### Competitive Features
- 🏆 **Global Leaderboards** - Compete for top net worth
- 👥 **Multiplayer Economy** - Interact with other players
- 🎯 **Strategic Competition** - Multiple paths to success

## 📚 Player Documentation

**New to QuickBuck?** Start here:
- � **[Quick Start Guide](./docs/QUICK_START.md)** - Get running in 10 minutes
- � **[Player Guide](./docs/PLAYER_GUIDE.md)** - Complete game features & strategies
- 🎯 **[Advanced Strategies](./docs/ADVANCED_STRATEGIES.md)** - Master-level tactics
- ⚙️ **[Game Mechanics](./docs/GAME_MECHANICS.md)** - Technical reference

**See the full documentation**: [docs/README.md](./docs/README.md)

## Tech Stack

### Frontend

- **React Router v7** - Full-stack React framework
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern component library with Radix UI
- **Lucide React & Tabler Icons** - Beautiful icon libraries
- **Recharts** - Data visualization
- **Motion** - Smooth animations

### Backend & Services

- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **OpenAI** - AI chat capabilities

### Development & Deployment

- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Vercel** - Deployment platform

## Getting Started

### Prerequisites

- Node.js 18+
- Clerk account for authentication
- Convex account for database
- OpenAI API key (for AI chat features)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file and configure your credentials:

```bash
cp .env.example .env.local
```

3. Set up your environment variables in `.env.local`:

```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# OpenAI Configuration (for AI chat)
OPENAI_API_KEY=your_openai_api_key_here

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

4. Initialize Convex:

```bash
npx convex dev
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Vercel Deployment (Recommended)

This starter kit is optimized for Vercel deployment with the `@vercel/react-router` preset:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The `react-router.config.ts` includes the Vercel preset for seamless deployment.

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Architecture

### Key Routes

- `/` - Homepage
- `/dashboard` - Protected user dashboard
- `/dashboard/chat` - AI-powered chat interface
- `/dashboard/settings` - User settings

### Key Components

#### Authentication & Authorization

- Protected routes with Clerk authentication
- Server-side user data loading with loaders
- Automatic user synchronization

#### Dashboard Features

- Interactive sidebar navigation
- Real-time data updates
- User profile management
- AI chat functionality

#### AI Chat Integration

- OpenAI-powered conversations
- Real-time message streaming
- Chat history persistence
- Responsive chat interface

## Environment Variables

### Required for Production

- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `VITE_CONVEX_URL` - Your Convex client URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `OPENAI_API_KEY` - OpenAI API key for chat features
- `FRONTEND_URL` - Your production frontend URL

## Project Structure

```
├── app/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── homepage/      # Homepage sections
│   │   └── dashboard/     # Dashboard components
│   ├── routes/            # React Router routes
│   └── utils/             # Utility functions
├── convex/                # Convex backend functions
├── public/                # Static assets
└── docs/                  # Documentation
```

## Key Dependencies

- `react` & `react-dom` v19 - Latest React
- `react-router` v7 - Full-stack React framework
- `@clerk/react-router` - Authentication
- `convex` - Real-time database
- `@ai-sdk/openai` & `ai` - AI chat capabilities
- `@vercel/react-router` - Vercel deployment
- `tailwindcss` v4 - Styling
- `@radix-ui/*` - UI primitives

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript checks

## 🚀 Performance & Optimization

QuickBuck has been extensively optimized for production, achieving **92-93% database bandwidth reduction**:

- **Before:** ~1,500 MB/day (Critical risk ⚠️)
- **After:** ~100-120 MB/day (Healthy ✅)
- **Query Speed:** 70% faster on average
- **Cost Savings:** ~$250/year in database costs

### Optimization Documentation

- 📊 [Executive Summary](./docs/EXECUTIVE_SUMMARY.md) - Quick overview
- 📖 [Complete Guide](./docs/DATABASE_OPTIMIZATION_COMPLETE.md) - All phases
- ⚡ [Quick Reference](./docs/OPTIMIZATION_QUICK_REFERENCE.md) - Best practices
- 📈 [Monitoring Checklist](./docs/MONITORING_CHECKLIST.md) - Health tracking

### Key Techniques Applied

1. ✅ Cached account balances
2. ✅ Batch operations with Promise.all
3. ✅ Indexed queries
4. ✅ Limited result sets
5. ✅ Time-bound historical queries

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Follow [optimization best practices](./docs/OPTIMIZATION_QUICK_REFERENCE.md)
5. Push to the branch
6. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Stop rebuilding the same foundation over and over.** RSK eliminates months of integration work by providing a complete, production-ready SaaS template with authentication, AI chat, and real-time data working seamlessly out of the box.

Built with ❤️ using React Router v7, Convex, Clerk, and OpenAI.  
**Optimized for scale** 🚀 | 92% bandwidth reduction achieved ⚡

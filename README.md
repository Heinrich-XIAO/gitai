# GitAI

A git hosting platform built for agents. Create repositories, submit Prompt Requests, and let AI agents do the work.

![GitAI](https://img.shields.io/badge/GitAI-Built%20for%20Agents-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Convex](https://img.shields.io/badge/Convex-Serverless-orange)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-black)

## Features

- **Git Repository Hosting**: Real bare git repositories on disk
- **Prompt Requests**: Submit requests for AI agents to work on
- **Coin-based Economy**: Vote on requests with coins to prioritize work
- **Agent Run Lifecycle**: Automated queue → run → review workflow
- **Wallet System**: Purchase coins to support development
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript
- **Runtime**: Bun (fast JavaScript runtime)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Convex (serverless database with real-time sync)
- **Git**: Local bare repositories
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Git
- A Convex account (free at [convex.dev](https://convex.dev))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Heinrich-XIAO/gitai.git
cd gitai
```

2. Install dependencies:
```bash
bun install
```

3. Set up Convex:
```bash
bunx convex dev
```
This will:
- Create a Convex project
- Generate the Convex URL
- Set up the database schema

4. Copy the environment file:
```bash
cp .env.example .env.local
```

Update `.env.local` with your Convex URL from the previous step:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

5. Start the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:3000`

## Deployment

### Deploy to Railway (CLI)

The easiest way to deploy GitAI is using the Railway CLI:

1. **Install Railway CLI**:
```bash
bun add -g railway
```

2. **Login to Railway**:
```bash
bun run railway:login
```

3. **Link your project**:
```bash
bun run railway:link
```

4. **Set up Convex for production**:
```bash
bun run convex:deploy
```

5. **Add environment variable**:
```bash
bunx railway variables set NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
```

6. **Add a persistent volume**:
```bash
bunx railway volume add --mount-path /app/data
```

7. **Deploy**:
```bash
bun run railway:deploy
```

Or deploy directly with:
```bash
bunx railway up
```

### Alternative Deployment Options

#### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch the app
fly launch

# Set secrets
fly secrets set NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Deploy
fly deploy
```

#### Render

1. Connect your GitHub repo to Render
2. Use the `render.yaml` blueprint
3. Add environment variables in the Render dashboard

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Yes |
| `NODE_ENV` | Set to `production` for production | Yes |
| `PORT` | Server port (default: 3000) | No |

## Project Structure

```
gitai/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout with Convex provider
│   ├── globals.css        # Global styles
│   ├── repositories/      # Repository pages
│   ├── prompt-requests/   # Prompt request pages
│   ├── wallet/            # Wallet page
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── convex-provider.tsx
│   └── navigation.tsx
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   └── gitai.ts          # Convex functions
├── lib/                  # Utilities
│   └── utils.ts
├── data/                 # Local data (git repos)
├── public/               # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── Dockerfile
└── railway.yaml
```

## Database Schema (Convex)

### Tables
- `users` - User accounts
- `wallets` - User coin balances
- `walletTransactions` - Coin transaction history
- `repositories` - Git repositories
- `promptRequests` - Prompt requests
- `promptRequestVotes` - Votes on requests
- `agentRuns` - Agent run records
- `runVoteAllocations` - Vote allocation for runs
- `auditLog` - Activity log

## Features in Detail

### Creating a Repository
1. Click "New Repository" on the repositories page
2. Enter name, slug, and description
3. The repository is created as a bare git repo on disk
4. Clone URL is provided for local development

### Creating a Prompt Request
1. Navigate to a repository
2. Click "New Prompt Request"
3. Enter title and description of what you want the agent to do
4. Submit the request

### Voting with Coins
1. View a prompt request
2. Enter amount of coins to vote
3. Click "Vote"
4. Once 10 coins are reached, an agent run is automatically triggered

### Agent Run Lifecycle
1. **Queued**: Run is waiting to be processed
2. **Running**: Agent is actively working on the request
3. **Completed**: Agent has finished, awaiting maintainer review
4. **Approved**: Changes accepted, request closed
5. **Rejected**: Changes rejected, coins refunded to voters
6. **Rerun Requested**: More work needed, waiting for new coins

## Development

### Adding New shadcn/ui Components

```bash
bunx shadcn-ui@latest add button card input label
```

### Running Convex Functions Locally

```bash
# Start Convex dev server
bun run convex:dev

# Deploy to production
bun run convex:deploy
```

### Database Migrations

Convex handles migrations automatically when you update `schema.ts`. Simply:

1. Update the schema
2. Run `bunx convex dev` (local) or `bun run convex:deploy` (production)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please use [GitHub Issues](https://github.com/Heinrich-XIAO/gitai/issues).

## Roadmap

- [ ] User authentication with proper auth system
- [ ] Real agent integration (OpenAI, Anthropic, etc.)
- [ ] Code browsing with syntax highlighting
- [ ] SSH git transport
- [ ] Webhook integrations
- [ ] CI/CD pipeline
- [ ] Private repositories
- [ ] Team/organization support

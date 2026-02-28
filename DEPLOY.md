# Deployment Guide

## Deploy to Railway (Recommended)

### Prerequisites
- [Bun](https://bun.sh) installed
- [Railway CLI](https://docs.railway.app/guides/cli) installed
- Convex account and project set up

### Step 1: Install Railway CLI

```bash
bun add -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

### Step 3: Create a New Project

```bash
railway init
```

Or link to an existing project:

```bash
railway link
```

### Step 4: Set Up Convex

Deploy your Convex backend:

```bash
bun run convex:deploy
```

Get your Convex URL from the output or from the Convex dashboard.

### Step 5: Add Environment Variables

Add your Convex URL to Railway:

```bash
railway variables set NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Step 6: Add Persistent Volume

GitAI needs persistent storage for git repositories. Add a volume:

```bash
railway volume add --mount-path /app/data
```

### Step 7: Deploy

Deploy your application:

```bash
railway up
```

Or for production:

```bash
railway up --environment production
```

### Step 8: View Logs

```bash
railway logs
```

### Step 9: Open Your App

```bash
railway open
```

## Continuous Deployment with GitHub Actions

### Setup

1. Go to your Railway project settings
2. Generate a Railway token
3. Add the token to your GitHub repository secrets as `RAILWAY_TOKEN`

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy on every push to main.

## Manual Deployment Checklist

- [ ] Convex project created and deployed
- [ ] `NEXT_PUBLIC_CONVEX_URL` environment variable set
- [ ] Persistent volume mounted at `/app/data`
- [ ] Git repositories will be stored in `/app/data/repos`

## Troubleshooting

### Build Failures

If the build fails, check:
1. All dependencies are in `package.json`
2. Bun lockfile is up to date (`bun install`)
3. TypeScript compilation passes (`bun run build` locally)

### Runtime Errors

Check logs with:
```bash
railway logs
```

### Database Connection Issues

Ensure `NEXT_PUBLIC_CONVEX_URL` is set correctly and the Convex project is deployed.

### Volume Issues

If git repositories are not persisting:
1. Check that the volume is mounted at `/app/data`
2. Verify the app has write permissions to that directory

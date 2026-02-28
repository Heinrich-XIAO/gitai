# CI/CD Deployment Setup

## GitHub Actions + Railway

This guide will help you set up automatic deployment to Railway whenever you push to the main branch.

### Step 1: Create Railway Project

First, you need to create a Railway project manually:

1. Go to https://railway.app
2. Click "New Project"
3. Select "Empty Project" (we'll connect the GitHub repo later)
4. Note down your project name

### Step 2: Get Railway Token

1. Go to https://railway.app/account
2. Scroll down to "Tokens" section
3. Click "New Token"
4. Name it "GitHub Actions"
5. Copy the token (you'll only see it once!)

### Step 3: Add Token to GitHub Secrets

1. Go to your GitHub repository: https://github.com/Heinrich-XIAO/gitai
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `RAILWAY_TOKEN`
5. Value: Paste your Railway token from Step 2
6. Click "Add secret"

### Step 4: Deploy Convex Backend

Before deploying the web app, deploy your Convex backend:

```bash
# Install dependencies
bun install

# Login to Convex (if not already)
bunx convex login

# Deploy Convex functions
bun run convex:deploy
```

Copy the Convex deployment URL from the output.

### Step 5: Add Environment Variables to Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add these variables:
   - `NEXT_PUBLIC_CONVEX_URL`: Your Convex URL (e.g., `https://your-project.convex.cloud`)
   - `NODE_ENV`: `production`
   - `PORT`: `3000`

### Step 6: Add Persistent Volume

GitAI needs persistent storage for git repositories:

1. In Railway dashboard, go to your service
2. Click "Settings" tab
3. Scroll to "Volumes" section
4. Click "Add Volume"
5. Mount path: `/app/data`
6. Size: 1GB

### Step 7: Link GitHub Repo to Railway (Optional)

If you want Railway to show deployment status:

1. In Railway dashboard, go to your project
2. Click "Settings"
3. Under "Source", click "Connect"
4. Select your GitHub repository

### Step 8: Deploy!

Push to main branch to trigger deployment:

```bash
git push origin main
```

Or manually trigger from GitHub:
1. Go to Actions tab in your repo
2. Click "Deploy to Railway"
3. Click "Run workflow"

### Step 9: Verify Deployment

1. Go to Railway dashboard
2. Click on your service
3. Check "Deployments" tab
4. Wait for deployment to complete
5. Click "View Logs" to see if everything is working

### Troubleshooting

**Deployment fails:**
- Check GitHub Actions logs in the Actions tab
- Verify `RAILWAY_TOKEN` is correct
- Ensure Railway project exists

**App crashes:**
- Check `NEXT_PUBLIC_CONVEX_URL` is set correctly
- Verify Convex backend is deployed
- Check Railway logs for errors

**Build fails:**
- The build might fail due to TypeScript errors (ignored in config)
- Check if all dependencies are in package.json

### Manual Deployment (Fallback)

If CI/CD doesn't work, deploy manually:

```bash
# Install Railway CLI
bun add -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Deploy
railway up
```

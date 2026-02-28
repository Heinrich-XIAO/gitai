import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { AppService } from "./app.js";
import { getDb } from "./db.js";
import { SESSION_COOKIE, PORT, COIN_PACKS } from "./config.js";
import type { Request, Response, NextFunction } from "express";

const app = express();
const appService = new AppService(getDb());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));

interface UserSession {
  userId: number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.cookies[SESSION_COOKIE];
  if (!userId) {
    if (req.headers.accept?.includes("application/json")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    return res.redirect("/login");
  }
  const user = appService.getUserById(Number(userId));
  if (!user) {
    res.clearCookie(SESSION_COOKIE);
    if (req.headers.accept?.includes("application/json")) {
      return res.status(401).json({ error: "User not found" });
    }
    return res.redirect("/login");
  }
  req.user = { userId: user.id, username: user.username };
  next();
}

function layout(title: string, content: string, user?: UserSession) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - GitAI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    header {
      background: #1a1a2e;
      color: white;
      padding: 1rem 0;
      margin-bottom: 2rem;
    }
    header .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header a {
      color: white;
      text-decoration: none;
    }
    header nav a {
      margin-left: 1.5rem;
      opacity: 0.9;
    }
    header nav a:hover {
      opacity: 1;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
    }
    .coin-badge {
      background: #ffd700;
      color: #1a1a2e;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-weight: bold;
      font-size: 0.875rem;
    }
    main {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { margin-bottom: 1rem; color: #1a1a2e; }
    h2 { margin: 1.5rem 0 1rem; color: #333; }
    h3 { margin: 1rem 0 0.5rem; color: #555; }
    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: #4a90d9;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }
    .btn:hover { background: #357abd; }
    .btn-secondary { background: #6c757d; }
    .btn-secondary:hover { background: #5a6268; }
    .btn-success { background: #28a745; }
    .btn-success:hover { background: #218838; }
    .btn-danger { background: #dc3545; }
    .btn-danger:hover { background: #c82333; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.875rem; }
    form { margin: 1rem 0; }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    input[type="text"],
    input[type="email"],
    input[type="number"],
    textarea,
    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    textarea { min-height: 100px; resize: vertical; }
    .form-group { margin-bottom: 1rem; }
    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    .success {
      background: #d4edda;
      color: #155724;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    .repo-list, .pr-list {
      display: grid;
      gap: 1rem;
    }
    .repo-card, .pr-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.25rem;
      background: #fafafa;
    }
    .repo-card h3, .pr-card h3 {
      margin: 0 0 0.5rem;
    }
    .repo-card a, .pr-card a {
      color: #4a90d9;
      text-decoration: none;
    }
    .repo-card a:hover, .pr-card a:hover {
      text-decoration: underline;
    }
    .meta {
      color: #666;
      font-size: 0.875rem;
    }
    .coins {
      color: #b8860b;
      font-weight: bold;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-open { background: #e3f2fd; color: #1565c0; }
    .status-queued { background: #fff3e0; color: #e65100; }
    .status-in_progress { background: #fce4ec; color: #c2185b; }
    .status-awaiting_review { background: #f3e5f5; color: #7b1fa2; }
    .status-approved { background: #e8f5e9; color: #2e7d32; }
    .status-rejected { background: #ffebee; color: #c62828; }
    .status-closed { background: #f5f5f5; color: #616161; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid #e0e0e0;
    }
    th { font-weight: 600; color: #555; }
    .commit-list {
      font-family: monospace;
      font-size: 0.875rem;
    }
    .commit-item {
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .sha { color: #666; }
    .branch-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .branch-tag {
      background: #e3f2fd;
      color: #1565c0;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: monospace;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .vote-form {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .vote-form input {
      width: 80px;
      margin-bottom: 0;
    }
    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .progress-fill {
      height: 100%;
      background: #4a90d9;
      transition: width 0.3s ease;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
    .section { margin-bottom: 2rem; }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .pack-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    .pack-card h3 { margin-bottom: 0.5rem; }
    .pack-card .price {
      font-size: 2rem;
      font-weight: bold;
      color: #4a90d9;
      margin: 1rem 0;
    }
    footer {
      text-align: center;
      padding: 2rem;
      color: #666;
      font-size: 0.875rem;
    }
    .audit-entry {
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <a href="/" class="logo">GitAI</a>
      <nav>
        <a href="/repositories">Repositories</a>
        <a href="/prompt-requests">Prompt Requests</a>
        ${user ? `
          <a href="/wallet">
            <span class="coin-badge">${user.username}</span>
          </a>
          <a href="/logout">Logout</a>
        ` : `
          <a href="/login">Login</a>
          <a href="/signup">Sign Up</a>
        `}
      </nav>
    </div>
  </header>
  <div class="container">
    <main>
      ${content}
    </main>
  </div>
  <footer>
    <div class="container">
      <p>GitAI - Built for Agents</p>
    </div>
  </footer>
</body>
</html>`;
}

// Home page
app.get("/", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  const user = userId ? appService.getUserById(Number(userId)) : undefined;
  const session = user ? { userId: user.id, username: user.username } : undefined;
  
  const data = appService.getHomeData();
  
  const content = `
    <div class="section">
      <h1>GitAI</h1>
      <p>A git hosting platform built for agents. Create repositories, submit Prompt Requests, and let AI agents do the work.</p>
      ${!session ? `<p style="margin-top: 1rem;"><a href="/signup" class="btn">Get Started</a> <a href="/login" class="btn btn-secondary">Login</a></p>` : ""}
    </div>
    
    <div class="grid-2">
      <div class="section">
        <h2>Top Repositories</h2>
        ${data.repositories.length === 0 ? 
          '<p class="empty-state">No repositories yet. <a href="/repositories/new">Create one</a></p>' :
          `<div class="repo-list">
            ${data.repositories.slice(0, 5).map((repo: any) => `
              <div class="repo-card">
                <h3><a href="/repositories/${repo.slug}">${repo.name}</a></h3>
                <p>${repo.description}</p>
                <p class="meta">by ${repo.maintainer_username} • ${repo.prompt_request_count} prompt requests • <span class="coins">${repo.total_demand} coins</span> demand</p>
              </div>
            `).join("")}
          </div>
          <p style="margin-top: 1rem;"><a href="/repositories">View all repositories →</a></p>
        `}
      </div>
      
      <div class="section">
        <h2>Top Prompt Requests</h2>
        ${data.topPromptRequests.length === 0 ?
          '<p class="empty-state">No prompt requests yet.</p>' :
          `<div class="pr-list">
            ${data.topPromptRequests.slice(0, 5).map((pr: any) => `
              <div class="pr-card">
                <h3><a href="/prompt-requests/${pr.id}">${pr.title}</a></h3>
                <p class="meta">${pr.repository_name} • by ${pr.author_username}</p>
                <p><span class="status status-${pr.status}">${pr.status.replace("_", " ")}</span> • <span class="coins">${pr.coinsAvailableForNextRun}/${10} coins</span> for next run</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min((pr.coinsAvailableForNextRun / 10) * 100, 100)}%"></div>
                </div>
              </div>
            `).join("")}
          </div>
          <p style="margin-top: 1rem;"><a href="/prompt-requests">View all prompt requests →</a></p>
        `}
      </div>
    </div>
    
    <div class="section">
      <h2>Get Coins</h2>
      <div class="grid-2">
        ${COIN_PACKS.map((pack: any) => `
          <div class="pack-card">
            <h3>${pack.id.split("-")[0].charAt(0).toUpperCase() + pack.id.split("-")[0].slice(1)} Pack</h3>
            <div class="price">$${(pack.usdCents / 100).toFixed(0)}</div>
            <p><span class="coins">${pack.coins} coins</span></p>
            ${session ? `<a href="/wallet/purchase/${pack.id}" class="btn">Purchase</a>` : `<a href="/signup" class="btn">Sign up to purchase</a>`}
          </div>
        `).join("")}
      </div>
    </div>
  `;
  
  res.send(layout("Home", content, session));
});

// Auth routes
app.get("/signup", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (userId) return res.redirect("/");
  
  const content = `
    <h1>Sign Up</h1>
    <p>Create an account and receive <span class="coins">50 starter coins</span>!</p>
    <form method="POST" action="/signup">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required pattern="[a-zA-Z0-9_-]{2,30}" title="2-30 characters, alphanumeric, underscores, and hyphens only">
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <button type="submit" class="btn">Create Account</button>
    </form>
    <p style="margin-top: 1rem;">Already have an account? <a href="/login">Login</a></p>
  `;
  res.send(layout("Sign Up", content));
});

app.post("/signup", (req, res) => {
  try {
    const user = appService.createUser(req.body);
    res.cookie(SESSION_COOKIE, String(user!.id), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
    res.redirect("/");
  } catch (error: any) {
    const content = `
      <h1>Sign Up</h1>
      <div class="error">${error.message}</div>
      <form method="POST" action="/signup">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" value="${req.body.username || ""}" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="${req.body.email || ""}" required>
        </div>
        <button type="submit" class="btn">Create Account</button>
      </form>
    `;
    res.send(layout("Sign Up", content));
  }
});

app.get("/login", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (userId) return res.redirect("/");
  
  const content = `
    <h1>Login</h1>
    <form method="POST" action="/login">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required>
      </div>
      <button type="submit" class="btn">Login</button>
    </form>
    <p style="margin-top: 1rem;">Don't have an account? <a href="/signup">Sign up</a></p>
  `;
  res.send(layout("Login", content));
});

app.post("/login", (req, res) => {
  const user = appService.loginByUsername(req.body.username);
  if (!user) {
    const content = `
      <h1>Login</h1>
      <div class="error">User not found</div>
      <form method="POST" action="/login">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
        </div>
        <button type="submit" class="btn">Login</button>
      </form>
    `;
    return res.send(layout("Login", content));
  }
  res.cookie(SESSION_COOKIE, String(user.id), { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.redirect("/");
});

// Repository routes
app.get("/repositories", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  const user = userId ? appService.getUserById(Number(userId)) : undefined;
  const session = user ? { userId: user.id, username: user.username } : undefined;
  
  const repos = appService.listRepositories();
  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h1>Repositories</h1>
      ${session ? `<a href="/repositories/new" class="btn">New Repository</a>` : ""}
    </div>
    ${repos.length === 0 ?
      `<div class="empty-state">
        <p>No repositories yet.</p>
        ${session ? `<p><a href="/repositories/new" class="btn">Create the first repository</a></p>` : `<p><a href="/signup">Sign up</a> to create one</p>`}
      </div>` :
      `<div class="repo-list">
        ${repos.map((repo: any) => `
          <div class="repo-card">
            <h3><a href="/repositories/${repo.slug}">${repo.name}</a></h3>
            <p>${repo.description}</p>
            <p class="meta">by ${repo.maintainer_username} • ${repo.prompt_request_count} prompt requests • <span class="coins">${repo.total_demand} coins</span> demand</p>
          </div>
        `).join("")}
      </div>`
    }
  `;
  res.send(layout("Repositories", content, session));
});

app.get("/repositories/new", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (!userId) return res.redirect("/login");
  const user = appService.getUserById(Number(userId));
  if (!user) return res.redirect("/login");
  const session = { userId: user.id, username: user.username };
  
  const content = `
    <h1>Create Repository</h1>
    <form method="POST" action="/repositories">
      <div class="form-group">
        <label for="name">Repository Name</label>
        <input type="text" id="name" name="name" required minlength="2" maxlength="80">
      </div>
      <div class="form-group">
        <label for="slug">Slug (URL-friendly name)</label>
        <input type="text" id="slug" name="slug" required pattern="[a-z0-9-]{2,40}" title="2-40 characters, lowercase alphanumeric and hyphens only">
      </div>
      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" required minlength="10" maxlength="280"></textarea>
      </div>
      <button type="submit" class="btn">Create Repository</button>
      <a href="/repositories" class="btn btn-secondary">Cancel</a>
    </form>
  `;
  res.send(layout("Create Repository", content, session));
});

app.post("/repositories", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (!userId) return res.redirect("/login");
  
  try {
    const repo = appService.createRepository(Number(userId), req.body);
    res.redirect(`/repositories/${repo!.slug}`);
  } catch (error: any) {
    const user = appService.getUserById(Number(userId));
    const session = user ? { userId: user.id, username: user.username } : undefined;
    const content = `
      <h1>Create Repository</h1>
      <div class="error">${error.message}</div>
      <form method="POST" action="/repositories">
        <div class="form-group">
          <label for="name">Repository Name</label>
          <input type="text" id="name" name="name" value="${req.body.name || ""}" required>
        </div>
        <div class="form-group">
          <label for="slug">Slug</label>
          <input type="text" id="slug" name="slug" value="${req.body.slug || ""}" required>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" required>${req.body.description || ""}</textarea>
        </div>
        <button type="submit" class="btn">Create Repository</button>
      </form>
    `;
    res.send(layout("Create Repository", content, session));
  }
});

app.get("/repositories/:slug", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  const user = userId ? appService.getUserById(Number(userId)) : undefined;
  const session = user ? { userId: user.id, username: user.username } : undefined;
  
  const data = appService.getRepositoryDetails(req.params.slug);
  if (!data) return res.status(404).send(layout("Not Found", "<h1>Repository not found</h1>", session));
  
  const isMaintainer = session && data.repository.maintainerUserId === session.userId;
  
  const content = `
    <div class="section">
      <h1>${data.repository.name}</h1>
      <p>${data.repository.description}</p>
      <p class="meta">by ${data.maintainer!.username} • Created ${new Date(data.repository.createdAt).toLocaleDateString()}</p>
    </div>
    
    <div class="section">
      <h2>Clone</h2>
      <code>${data.repository.cloneUrl}</code>
    </div>
    
    <div class="section">
      <h2>Branches (${data.branches.length})</h2>
      ${data.branches.length === 0 ?
        '<p>No branches yet.</p>' :
        `<div class="branch-list">
          ${data.branches.map((b: any) => `<span class="branch-tag">${b.name}</span>`).join("")}
        </div>`
      }
    </div>
    
    <div class="section">
      <h2>Recent Commits</h2>
      ${data.commits.length === 0 ?
        '<p>No commits yet.</p>' :
        `<div class="commit-list">
          ${data.commits.map((c: any) => `
            <div class="commit-item">
              <span class="sha">${c.shortSha}</span> ${c.subject} • ${c.author} • ${c.date}
            </div>
          `).join("")}
        </div>`
      }
    </div>
    
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>Prompt Requests</h2>
        ${session ? `<a href="/repositories/${data.repository.slug}/prompt-requests/new" class="btn btn-sm">New Prompt Request</a>` : ""}
      </div>
      ${data.promptRequests.length === 0 ?
        `<div class="empty-state">
          <p>No prompt requests yet.</p>
          ${session ? `<p><a href="/repositories/${data.repository.slug}/prompt-requests/new" class="btn">Create the first prompt request</a></p>` : ""}
        </div>` :
        `<div class="pr-list">
          ${data.promptRequests.map((pr: any) => `
            <div class="pr-card">
              <h3><a href="/prompt-requests/${pr.id}">${pr.title}</a></h3>
              <p class="meta">by ${pr.author_username}</p>
              <p><span class="status status-${pr.status}">${pr.status.replace("_", " ")}</span> • <span class="coins">${pr.coinsAvailableForNextRun}/${10} coins</span> for next run • ${pr.totalCoinsCommitted} total committed</p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min((pr.coinsAvailableForNextRun / 10) * 100, 100)}%"></div>
              </div>
            </div>
          `).join("")}
        </div>`
      }
    </div>
  `;
  
  res.send(layout(data.repository.name, content, session));
});

// Prompt Request routes
app.get("/repositories/:slug/prompt-requests/new", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (!userId) return res.redirect("/login");
  const user = appService.getUserById(Number(userId));
  if (!user) return res.redirect("/login");
  const session = { userId: user.id, username: user.username };
  
  const repo = appService.getRepositoryBySlug(req.params.slug);
  if (!repo) return res.status(404).send(layout("Not Found", "<h1>Repository not found</h1>", session));
  
  const content = `
    <h1>New Prompt Request</h1>
    <p>Creating request for <strong>${repo.name}</strong></p>
    <form method="POST" action="/repositories/${repo.slug}/prompt-requests">
      <div class="form-group">
        <label for="title">Title</label>
        <input type="text" id="title" name="title" required minlength="4" maxlength="120">
      </div>
      <div class="form-group">
        <label for="body">Description</label>
        <textarea id="body" name="body" required minlength="10" maxlength="2000" placeholder="Describe what you want the agent to do..."></textarea>
      </div>
      <button type="submit" class="btn">Create Prompt Request</button>
      <a href="/repositories/${repo.slug}" class="btn btn-secondary">Cancel</a>
    </form>
  `;
  res.send(layout("New Prompt Request", content, session));
});

app.post("/repositories/:slug/prompt-requests", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  if (!userId) return res.redirect("/login");
  
  const repo = appService.getRepositoryBySlug(req.params.slug);
  if (!repo) return res.status(404).send("Repository not found");
  
  try {
    const pr = appService.createPromptRequest(Number(userId), repo.id, req.body);
    res.redirect(`/prompt-requests/${pr!.id}`);
  } catch (error: any) {
    const user = appService.getUserById(Number(userId));
    const session = user ? { userId: user.id, username: user.username } : undefined;
    const content = `
      <h1>New Prompt Request</h1>
      <div class="error">${error.message}</div>
      <form method="POST" action="/repositories/${repo.slug}/prompt-requests">
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" value="${req.body.title || ""}" required>
        </div>
        <div class="form-group">
          <label for="body">Description</label>
          <textarea id="body" name="body" required>${req.body.body || ""}</textarea>
        </div>
        <button type="submit" class="btn">Create Prompt Request</button>
      </form>
    `;
    res.send(layout("New Prompt Request", content, session));
  }
});

app.get("/prompt-requests", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  const user = userId ? appService.getUserById(Number(userId)) : undefined;
  const session = user ? { userId: user.id, username: user.username } : undefined;
  
  const data = appService.getHomeData();
  const content = `
    <h1>All Prompt Requests</h1>
    ${data.topPromptRequests.length === 0 ?
      '<div class="empty-state"><p>No prompt requests yet.</p></div>' :
      `<div class="pr-list">
        ${data.topPromptRequests.map((pr: any) => `
          <div class="pr-card">
            <h3><a href="/prompt-requests/${pr.id}">${pr.title}</a></h3>
            <p class="meta">${pr.repository_name} • by ${pr.author_username}</p>
            <p><span class="status status-${pr.status}">${pr.status.replace("_", " ")}</span> • <span class="coins">${pr.coinsAvailableForNextRun}/${10} coins</span> for next run</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((pr.coinsAvailableForNextRun / 10) * 100, 100)}%"></div>
            </div>
          </div>
        `).join("")}
      </div>`
    }
  `;
  res.send(layout("Prompt Requests", content, session));
});

app.get("/prompt-requests/:id", (req, res) => {
  const userId = req.cookies[SESSION_COOKIE];
  const user = userId ? appService.getUserById(Number(userId)) : undefined;
  const session = user ? { userId: user.id, username: user.username } : undefined;
  
  const data = appService.getPromptRequestDetails(Number(req.params.id));
  if (!data) return res.status(404).send(layout("Not Found", "<h1>Prompt Request not found</h1>", session));
  
  const isMaintainer = session && data.promptRequest.maintainerUserId === session.userId;
  const canVote = session && !["approved", "rejected", "closed"].includes(data.promptRequest.status);
  const awaitingReview = data.promptRequest.status === "awaiting_review";
  
  const content = `
    <div class="section">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1>${data.promptRequest.title}</h1>
          <p class="meta">${data.promptRequest.repository_name} • by ${data.promptRequest.author_username} • ${new Date(data.promptRequest.createdAt).toLocaleDateString()}</p>
        </div>
        <span class="status status-${data.promptRequest.status}">${data.promptRequest.status.replace("_", " ")}</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Description</h2>
      <p style="white-space: pre-wrap;">${data.promptRequest.body}</p>
    </div>
    
    <div class="section">
      <h2>Funding Progress</h2>
      <p><span class="coins">${data.promptRequest.totalCoinsCommitted} coins</span> total committed</p>
      <p><span class="coins">${data.promptRequest.coinsAvailableForNextRun} coins</span> available for next run</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${Math.min((data.promptRequest.coinsAvailableForNextRun / 10) * 100, 100)}%"></div>
      </div>
      <p class="meta">Need 10 coins to trigger next agent run</p>
    </div>
    
    ${canVote ? `
      <div class="section">
        <h2>Vote with Coins</h2>
        ${session ? `
          <form method="POST" action="/prompt-requests/${data.promptRequest.id}/vote" class="vote-form">
            <input type="number" name="coins" min="1" max="10000" value="1" required>
            <button type="submit" class="btn">Vote</button>
          </form>
        ` : `<p><a href="/login">Login</a> to vote</p>`}
      </div>
    ` : ""}
    
    <div class="section">
      <h2>Vote History</h2>
      ${data.votes.length === 0 ?
        '<p>No votes yet.</p>' :
        `<table>
          <thead>
            <tr><th>User</th><th>Coins</th><th>Remaining</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${data.votes.map((v: any) => `
              <tr>
                <td>${v.username}</td>
                <td class="coins">${v.coins}</td>
                <td class="coins">${v.remainingCoins}</td>
                <td>${v.runAllocationStatus.replace(/_/g, " ")}${v.refundedAt ? " (refunded)" : ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`
      }
    </div>
    
    <div class="section">
      <h2>Agent Runs</h2>
      ${data.runs.length === 0 ?
        '<p>No runs yet. Add coins to trigger the first run!</p>' :
        `<div>
          ${data.runs.map((run: any) => `
            <div class="pr-card" id="run-${run.id}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Run #${run.runNumber}</h3>
                <span class="status status-${run.status}">${run.status.replace("_", " ")}</span>
              </div>
              <p class="meta">Triggered: ${new Date(run.triggeredAt).toLocaleString()}</p>
              ${run.completedAt ? `<p class="meta">Completed: ${new Date(run.completedAt).toLocaleString()}</p>` : ""}
              ${run.summary ? `<p>${run.summary}</p>` : ""}
              ${run.artifactUrl ? `<p><a href="${run.artifactUrl}">View artifact</a></p>` : ""}
              
              ${isMaintainer && run.status === "completed" ? `
                <div class="actions">
                  <form method="POST" action="/prompt-requests/${data.promptRequest.id}/runs/${run.id}/approve" style="display: inline;">
                    <button type="submit" class="btn btn-success btn-sm">Approve</button>
                  </form>
                  <form method="POST" action="/prompt-requests/${data.promptRequest.id}/runs/${run.id}/rerun" style="display: inline;">
                    <button type="submit" class="btn btn-secondary btn-sm">Request Rerun</button>
                  </form>
                  <form method="POST" action="/prompt-requests/${data.promptRequest.id}/runs/${run.id}/reject" style="display: inline;">
                    <button type="submit" class="btn btn-danger btn-sm">Reject</button>
                  </form>
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>`
      }
    </div>
    
    <div class="section">
      <h2>Audit Log</h2>
      ${data.audit.length === 0 ?
        '<p>No activity yet.</p>' :
        `<div>
          ${data.audit.map((entry: any) => `
            <div class="audit-entry">
              <strong>${entry.action.replace(/\./g, " ")}</strong> by ${entry.username}
              ${entry.details ? `• ${entry.details}` : ""}
              <span class="meta">• ${new Date(entry.createdAt).toLocaleString()}</span>
            </div>
          `).join("")}
        </div>`
      }
    </div>
  `;
  
  res.send(layout(data.promptRequest.title, content, session));
});

app.post("/prompt-requests/:id/vote", requireAuth, (req, res) => {
  try {
    appService.voteOnPromptRequest(req.user!.userId, Number(req.params.id), req.body);
    res.redirect(`/prompt-requests/${req.params.id}`);
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/prompt-requests/${req.params.id}">Go back</a>`);
  }
});

app.post("/prompt-requests/:id/runs/:runId/approve", requireAuth, (req, res) => {
  try {
    appService.approveRun(req.user!.userId, Number(req.params.runId));
    res.redirect(`/prompt-requests/${req.params.id}`);
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/prompt-requests/${req.params.id}">Go back</a>`);
  }
});

app.post("/prompt-requests/:id/runs/:runId/reject", requireAuth, (req, res) => {
  try {
    appService.rejectRun(req.user!.userId, Number(req.params.runId));
    res.redirect(`/prompt-requests/${req.params.id}`);
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/prompt-requests/${req.params.id}">Go back</a>`);
  }
});

app.post("/prompt-requests/:id/runs/:runId/rerun", requireAuth, (req, res) => {
  try {
    appService.rerunRequest(req.user!.userId, Number(req.params.runId));
    res.redirect(`/prompt-requests/${req.params.id}`);
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/prompt-requests/${req.params.id}">Go back</a>`);
  }
});

// Wallet routes
app.get("/wallet", requireAuth, (req, res) => {
  const wallet = appService.getWallet(req.user!.userId);
  const transactions = appService.getWalletTransactions(req.user!.userId);
  
  const content = `
    <h1>My Wallet</h1>
    
    <div class="section">
      <h2>Balance</h2>
      <p style="font-size: 2rem;" class="coins">${wallet?.availableCoins || 0} coins</p>
      <p class="meta">Lifetime purchased: ${wallet?.lifetimeCoinsPurchased || 0} • Lifetime granted: ${wallet?.lifetimeCoinsGranted || 0} • Lifetime spent: ${wallet?.lifetimeCoinsSpent || 0}</p>
    </div>
    
    <div class="section">
      <h2>Purchase Coins</h2>
      <div class="grid-2">
        ${COIN_PACKS.map((pack: any) => `
          <div class="pack-card">
            <h3>${pack.id.split("-")[0].charAt(0).toUpperCase() + pack.id.split("-")[0].slice(1)} Pack</h3>
            <div class="price">$${(pack.usdCents / 100).toFixed(0)}</div>
            <p><span class="coins">${pack.coins} coins</span></p>
            <form method="POST" action="/wallet/purchase">
              <input type="hidden" name="packId" value="${pack.id}">
              <button type="submit" class="btn">Purchase</button>
            </form>
          </div>
        `).join("")}
      </div>
      <p class="meta" style="margin-top: 1rem;">Note: In the prototype, purchases are simulated and do not charge real money.</p>
    </div>
    
    <div class="section">
      <h2>Transaction History</h2>
      ${transactions.length === 0 ?
        '<p>No transactions yet.</p>' :
        `<table>
          <thead>
            <tr><th>Type</th><th>Amount</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${transactions.map((t: any) => `
              <tr>
                <td>${t.type.replace(/_/g, " ")}</td>
                <td class="coins">${t.coinsDelta > 0 ? "+" : ""}${t.coinsDelta}</td>
                <td>${new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`
      }
    </div>
  `;
  
  res.send(layout("My Wallet", content, req.user));
});

app.post("/wallet/purchase", requireAuth, (req, res) => {
  try {
    const packId = req.body.packId || req.params.packId;
    appService.purchaseCoins(req.user!.userId, packId);
    res.redirect("/wallet");
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/wallet">Go back</a>`);
  }
});

app.get("/wallet/purchase/:packId", requireAuth, (req, res) => {
  try {
    appService.purchaseCoins(req.user!.userId, req.params.packId);
    res.redirect("/wallet");
  } catch (error: any) {
    res.status(400).send(`Error: ${error.message}. <a href="/wallet">Go back</a>`);
  }
});

// Internal agent processing endpoint
app.post("/internal/agent-runs/process", (req, res) => {
  try {
    appService.processQueuedRunsNow();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes (JSON)
app.get("/api/me", requireAuth, (req, res) => {
  const user = appService.getUserById(req.user!.userId);
  const wallet = appService.getWallet(req.user!.userId);
  res.json({ user, wallet });
});

app.get("/api/me/wallet", requireAuth, (req, res) => {
  const wallet = appService.getWallet(req.user!.userId);
  res.json(wallet);
});

app.get("/api/me/wallet/transactions", requireAuth, (req, res) => {
  const transactions = appService.getWalletTransactions(req.user!.userId);
  res.json(transactions);
});

app.get("/api/repositories", (req, res) => {
  const repos = appService.listRepositories();
  res.json(repos);
});

app.post("/api/repositories", requireAuth, (req, res) => {
  try {
    const repo = appService.createRepository(req.user!.userId, req.body);
    res.json(repo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/repositories/:slug", (req, res) => {
  const data = appService.getRepositoryDetails(req.params.slug);
  if (!data) return res.status(404).json({ error: "Repository not found" });
  res.json(data);
});

app.post("/api/repositories/:slug/prompt-requests", requireAuth, (req, res) => {
  const repo = appService.getRepositoryBySlug(req.params.slug);
  if (!repo) return res.status(404).json({ error: "Repository not found" });
  try {
    const pr = appService.createPromptRequest(req.user!.userId, repo.id, req.body);
    res.json(pr);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/prompt-requests/:id", (req, res) => {
  const data = appService.getPromptRequestDetails(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "Prompt Request not found" });
  res.json(data);
});

app.get("/api/prompt-requests/:id/votes", (req, res) => {
  const data = appService.getPromptRequestDetails(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "Prompt Request not found" });
  res.json(data.votes);
});

app.post("/api/prompt-requests/:id/vote", requireAuth, (req, res) => {
  try {
    appService.voteOnPromptRequest(req.user!.userId, Number(req.params.id), req.body);
    const data = appService.getPromptRequestDetails(Number(req.params.id));
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/prompt-requests/:id/runs", (req, res) => {
  const data = appService.getPromptRequestDetails(Number(req.params.id));
  if (!data) return res.status(404).json({ error: "Prompt Request not found" });
  res.json(data.runs);
});

app.post("/api/prompt-requests/:id/runs/:runId/approve", requireAuth, (req, res) => {
  try {
    appService.approveRun(req.user!.userId, Number(req.params.runId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/prompt-requests/:id/runs/:runId/reject", requireAuth, (req, res) => {
  try {
    appService.rejectRun(req.user!.userId, Number(req.params.runId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/prompt-requests/:id/runs/:runId/rerun-request", requireAuth, (req, res) => {
  try {
    appService.rerunRequest(req.user!.userId, Number(req.params.runId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/wallet/purchase-options", (req, res) => {
  res.json(COIN_PACKS);
});

app.post("/api/wallet/purchase", requireAuth, (req, res) => {
  try {
    appService.purchaseCoins(req.user!.userId, req.body.packId);
    const wallet = appService.getWallet(req.user!.userId);
    res.json(wallet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`GitAI server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${process.cwd()}/data`);
});

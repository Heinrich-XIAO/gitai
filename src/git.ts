import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { REPOS_DIR, WORK_DIR } from "./config.js";

function runGit(args: string[], cwd?: string) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function ensureRepoDirs() {
  fs.mkdirSync(REPOS_DIR, { recursive: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });
}

export function createBareRepository(slug: string, name: string, description: string) {
  ensureRepoDirs();
  const bareRepoPath = path.join(REPOS_DIR, `${slug}.git`);
  if (fs.existsSync(bareRepoPath)) {
    throw new Error("Repository path already exists");
  }

  runGit(["init", "--bare", "--initial-branch=main", bareRepoPath]);
  seedRepository(bareRepoPath, slug, name, description);
  return {
    bareRepoPath,
    cloneUrl: `file://${bareRepoPath}`,
  };
}

function seedRepository(
  bareRepoPath: string,
  slug: string,
  name: string,
  description: string,
) {
  const tempDir = fs.mkdtempSync(path.join(WORK_DIR, `${slug}-`));
  try {
    runGit(["init", "--initial-branch=main"], tempDir);
    runGit(["config", "user.name", "GitAI Agent"], tempDir);
    runGit(["config", "user.email", "agent@gitai.local"], tempDir);

    fs.writeFileSync(
      path.join(tempDir, "README.md"),
      `# ${name}\n\n${description}\n\nHosted on GitAI for agent-first collaboration.\n`,
      "utf8",
    );

    fs.writeFileSync(
      path.join(tempDir, ".gitignore"),
      "node_modules/\ndist/\n.DS_Store\n",
      "utf8",
    );

    runGit(["add", "."], tempDir);
    runGit(["commit", "-m", "Initial commit"], tempDir);
    runGit(["remote", "add", "origin", bareRepoPath], tempDir);
    runGit(["push", "-u", "origin", "main"], tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function listBranches(bareRepoPath: string) {
  ensureRepoDirs();
  const output = runGit(["for-each-ref", "--format=%(refname:short)|%(objectname:short)", "refs/heads"], bareRepoPath);
  if (!output) {
    return [];
  }
  return output.split("\n").map((line) => {
    const [name, sha] = line.split("|");
    return { name, sha };
  });
}

export function listCommits(bareRepoPath: string, limit = 8) {
  ensureRepoDirs();
  const format = "%H|%h|%an|%ad|%s";
  const output = runGit(
    ["log", `--max-count=${limit}`, "--date=short", `--pretty=format:${format}`, "--all"],
    bareRepoPath,
  );
  if (!output) {
    return [];
  }
  return output.split("\n").map((line) => {
    const [sha, shortSha, author, date, subject] = line.split("|");
    return { sha, shortSha, author, date, subject };
  });
}

export function getHeadSha(bareRepoPath: string) {
  try {
    return runGit(["rev-parse", "HEAD"], bareRepoPath);
  } catch {
    return "";
  }
}

export function getRepoFilesystemPath(bareRepoPath: string) {
  return bareRepoPath.replace(`${os.homedir()}/`, "~/");
}


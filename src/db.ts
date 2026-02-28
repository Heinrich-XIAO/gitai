import fs from "node:fs";
import Database from "better-sqlite3";
import { DB_PATH, DATA_DIR } from "./config.js";

let database: Database.Database | null = null;

export function getDb() {
  if (database) {
    return database;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  initialize(database);
  return database;
}

function initialize(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      starter_coins_granted_at TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallets (
      user_id INTEGER PRIMARY KEY,
      available_coins INTEGER NOT NULL DEFAULT 0 CHECK (available_coins >= 0),
      lifetime_coins_purchased INTEGER NOT NULL DEFAULT 0,
      lifetime_coins_granted INTEGER NOT NULL DEFAULT 0,
      lifetime_coins_spent INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      coins_delta INTEGER NOT NULL,
      usd_amount_cents INTEGER,
      prompt_request_id INTEGER,
      run_id INTEGER,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      maintainer_user_id INTEGER NOT NULL,
      bare_repo_path TEXT NOT NULL UNIQUE,
      clone_url TEXT NOT NULL,
      default_branch TEXT NOT NULL DEFAULT 'main',
      agent_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (maintainer_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompt_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repository_id INTEGER NOT NULL,
      author_user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      total_coins_committed INTEGER NOT NULL DEFAULT 0,
      coins_available_for_next_run INTEGER NOT NULL DEFAULT 0,
      current_run_number INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompt_request_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_request_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      coins INTEGER NOT NULL CHECK (coins > 0),
      remaining_coins INTEGER NOT NULL CHECK (remaining_coins >= 0),
      run_allocation_status TEXT NOT NULL DEFAULT 'reserved_for_future',
      run_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      refunded_at TEXT,
      FOREIGN KEY (prompt_request_id) REFERENCES prompt_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_request_id INTEGER NOT NULL,
      run_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      coins_consumed INTEGER NOT NULL,
      triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      reviewed_at TEXT,
      artifact_url TEXT,
      result_payload TEXT,
      summary TEXT,
      failure_reason TEXT,
      FOREIGN KEY (prompt_request_id) REFERENCES prompt_requests(id) ON DELETE CASCADE,
      UNIQUE (prompt_request_id, run_number)
    );

    CREATE TABLE IF NOT EXISTS run_vote_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      vote_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      coins_allocated INTEGER NOT NULL CHECK (coins_allocated > 0),
      refunded_at TEXT,
      UNIQUE (run_id, vote_id),
      FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (vote_id) REFERENCES prompt_request_votes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER NOT NULL,
      repository_id INTEGER,
      prompt_request_id INTEGER,
      run_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_requests_repository ON prompt_requests(repository_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_request ON prompt_request_votes(prompt_request_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_runs_request ON agent_runs(prompt_request_id, run_number DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_request ON audit_log(prompt_request_id, created_at DESC);
  `);
}

export function resetDbForTests() {
  if (database) {
    database.close();
    database = null;
  }
  if (fs.existsSync(DB_PATH)) {
    fs.rmSync(DB_PATH);
  }
}


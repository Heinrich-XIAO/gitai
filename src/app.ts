import Database from "better-sqlite3";
import { z } from "zod";
import {
  COIN_PACKS,
  RUN_THRESHOLD_COINS,
  STARTER_COINS,
} from "./config.js";
import { getDb } from "./db.js";
import { createBareRepository, getHeadSha, listBranches, listCommits } from "./git.js";
import type {
  AgentRun,
  AuditLogEntry,
  PromptRequest,
  PromptRequestVote,
  Repository,
  User,
  Wallet,
  WalletTransaction,
} from "./types.js";

const signupSchema = z.object({
  username: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().trim().email(),
});

const repoSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(280),
});

const promptRequestSchema = z.object({
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(10).max(2000),
});

const voteSchema = z.object({
  coins: z.coerce.number().int().min(1).max(10_000),
});

export class AppService {
  constructor(private readonly db: Database.Database = getDb()) {}

  createUser(input: z.input<typeof signupSchema>) {
    const parsed = signupSchema.parse(input);
    const tx = this.db.transaction(() => {
      const insertUser = this.db.prepare(`
        INSERT INTO users (username, email, starter_coins_granted_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      const result = insertUser.run(parsed.username, parsed.email);
      const userId = Number(result.lastInsertRowid);

      this.db.prepare(`
        INSERT INTO wallets (
          user_id,
          available_coins,
          lifetime_coins_purchased,
          lifetime_coins_granted,
          lifetime_coins_spent
        ) VALUES (?, ?, 0, ?, 0)
      `).run(userId, STARTER_COINS, STARTER_COINS);

      this.db.prepare(`
        INSERT INTO wallet_transactions (
          user_id, type, coins_delta, metadata
        ) VALUES (?, 'signup_grant', ?, ?)
      `).run(userId, STARTER_COINS, JSON.stringify({ source: "signup" }));

      return this.getUserById(userId);
    });

    return tx();
  }

  loginByUsername(username: string) {
    return this.db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
  }

  getUserById(userId: number): User | undefined {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      starterCoinsGrantedAt: row.starter_coins_granted_at,
      role: row.role,
      createdAt: row.created_at,
    } as User;
  }

  getWallet(userId: number) {
    const row = this.db.prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as any;
    if (!row) return undefined;
    return {
      userId: row.user_id,
      availableCoins: row.available_coins,
      lifetimeCoinsPurchased: row.lifetime_coins_purchased,
      lifetimeCoinsGranted: row.lifetime_coins_granted,
      lifetimeCoinsSpent: row.lifetime_coins_spent,
    } as Wallet;
  }

  getWalletTransactions(userId: number) {
    return this.db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 50
    `).all(userId) as WalletTransaction[];
  }

  createRepository(maintainerUserId: number, input: z.input<typeof repoSchema>) {
    const parsed = repoSchema.parse(input);
    const created = createBareRepository(parsed.slug, parsed.name, parsed.description);

    const tx = this.db.transaction(() => {
      this.db.prepare("UPDATE users SET role = 'maintainer' WHERE id = ?").run(maintainerUserId);
      const result = this.db.prepare(`
        INSERT INTO repositories (
          slug, name, description, visibility, maintainer_user_id, bare_repo_path, clone_url, default_branch, agent_enabled
        ) VALUES (?, ?, ?, 'public', ?, ?, ?, 'main', 1)
      `).run(
        parsed.slug,
        parsed.name,
        parsed.description,
        maintainerUserId,
        created.bareRepoPath,
        created.cloneUrl,
      );

      const repositoryId = Number(result.lastInsertRowid);
      this.logAction(maintainerUserId, repositoryId, null, null, "repository.created", JSON.stringify({ slug: parsed.slug }));
      return this.getRepositoryById(repositoryId);
    });

    return tx();
  }

  listRepositories() {
    return this.db.prepare(`
      SELECT
        repositories.*,
        users.username AS maintainer_username,
        COUNT(DISTINCT prompt_requests.id) AS prompt_request_count,
        COALESCE(SUM(prompt_requests.total_coins_committed), 0) AS total_demand
      FROM repositories
      JOIN users ON users.id = repositories.maintainer_user_id
      LEFT JOIN prompt_requests ON prompt_requests.repository_id = repositories.id
      GROUP BY repositories.id
      ORDER BY total_demand DESC, repositories.created_at DESC
    `).all() as Array<Repository & { maintainer_username: string; prompt_request_count: number; total_demand: number }>;
  }

  private mapRepository(row: any): Repository {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      visibility: row.visibility,
      maintainerUserId: row.maintainer_user_id,
      bareRepoPath: row.bare_repo_path,
      cloneUrl: row.clone_url,
      defaultBranch: row.default_branch,
      agentEnabled: row.agent_enabled,
      createdAt: row.created_at,
    } as Repository;
  }

  getRepositoryById(repositoryId: number): Repository | undefined {
    const row = this.db.prepare("SELECT * FROM repositories WHERE id = ?").get(repositoryId) as any;
    if (!row) return undefined;
    return this.mapRepository(row);
  }

  getRepositoryBySlug(slug: string): Repository | undefined {
    const row = this.db.prepare("SELECT * FROM repositories WHERE slug = ?").get(slug) as any;
    if (!row) return undefined;
    return this.mapRepository(row);
  }

  getRepositoryDetails(slug: string) {
    const repository = this.getRepositoryBySlug(slug);
    if (!repository) {
      return undefined;
    }
    const maintainer = this.getUserById(repository.maintainerUserId);
    const promptRequests = this.db.prepare(`
      SELECT
        prompt_requests.*,
        users.username AS author_username
      FROM prompt_requests
      JOIN users ON users.id = prompt_requests.author_user_id
      WHERE repository_id = ?
      ORDER BY
        prompt_requests.coins_available_for_next_run DESC,
        prompt_requests.total_coins_committed DESC,
        prompt_requests.updated_at DESC
    `).all(repository.id) as Array<PromptRequest & { author_username: string }>;

    return {
      repository,
      maintainer,
      branches: listBranches(repository.bareRepoPath),
      commits: listCommits(repository.bareRepoPath, 12),
      headSha: getHeadSha(repository.bareRepoPath),
      promptRequests,
    };
  }

  createPromptRequest(authorUserId: number, repositoryId: number, input: z.input<typeof promptRequestSchema>) {
    const parsed = promptRequestSchema.parse(input);
    const repository = this.getRepositoryById(repositoryId);
    if (!repository) {
      throw new Error("Repository not found");
    }

    const result = this.db.prepare(`
      INSERT INTO prompt_requests (
        repository_id, author_user_id, title, body, status, total_coins_committed, coins_available_for_next_run, current_run_number, updated_at
      ) VALUES (?, ?, ?, ?, 'open', 0, 0, 0, CURRENT_TIMESTAMP)
    `).run(repositoryId, authorUserId, parsed.title, parsed.body);
    const promptRequestId = Number(result.lastInsertRowid);
    this.logAction(authorUserId, repositoryId, promptRequestId, null, "prompt_request.created", null);
    return this.getPromptRequestById(promptRequestId);
  }

  getPromptRequestById(promptRequestId: number): PromptRequest | undefined {
    const row = this.db.prepare("SELECT * FROM prompt_requests WHERE id = ?").get(promptRequestId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      repositoryId: row.repository_id,
      authorUserId: row.author_user_id,
      title: row.title,
      body: row.body,
      status: row.status,
      totalCoinsCommitted: row.total_coins_committed,
      coinsAvailableForNextRun: row.coins_available_for_next_run,
      currentRunNumber: row.current_run_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as PromptRequest;
  }

  getPromptRequestDetails(promptRequestId: number) {
    const row = this.db.prepare(`
      SELECT
        prompt_requests.*,
        repositories.slug AS repository_slug,
        repositories.name AS repository_name,
        repositories.maintainer_user_id AS maintainer_user_id,
        users.username AS author_username
      FROM prompt_requests
      JOIN repositories ON repositories.id = prompt_requests.repository_id
      JOIN users ON users.id = prompt_requests.author_user_id
      WHERE prompt_requests.id = ?
    `).get(promptRequestId) as any;

    if (!row) {
      return undefined;
    }

    const promptRequest = {
      id: row.id,
      repositoryId: row.repository_id,
      authorUserId: row.author_user_id,
      title: row.title,
      body: row.body,
      status: row.status,
      totalCoinsCommitted: row.total_coins_committed,
      coinsAvailableForNextRun: row.coins_available_for_next_run,
      currentRunNumber: row.current_run_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      repository_slug: row.repository_slug,
      repository_name: row.repository_name,
      maintainer_user_id: row.maintainer_user_id,
      author_username: row.author_username,
    };

    const voteRows = this.db.prepare(`
      SELECT
        prompt_request_votes.*,
        users.username
      FROM prompt_request_votes
      JOIN users ON users.id = prompt_request_votes.user_id
      WHERE prompt_request_id = ?
      ORDER BY prompt_request_votes.id ASC
    `).all(promptRequestId) as any[];

    const votes = voteRows.map((v) => ({
      id: v.id,
      promptRequestId: v.prompt_request_id,
      userId: v.user_id,
      coins: v.coins,
      remainingCoins: v.remaining_coins,
      runAllocationStatus: v.run_allocation_status,
      runId: v.run_id,
      createdAt: v.created_at,
      refundedAt: v.refunded_at,
      username: v.username,
    }));

    const runRows = this.db.prepare(`
      SELECT * FROM agent_runs
      WHERE prompt_request_id = ?
      ORDER BY run_number DESC
    `).all(promptRequestId) as any[];

    const runs = runRows.map((r) => ({
      id: r.id,
      promptRequestId: r.prompt_request_id,
      runNumber: r.run_number,
      status: r.status,
      coinsConsumed: r.coins_consumed,
      triggeredAt: r.triggered_at,
      completedAt: r.completed_at,
      reviewedAt: r.reviewed_at,
      artifactUrl: r.artifact_url,
      resultPayload: r.result_payload,
      summary: r.summary,
      failureReason: r.failure_reason,
    }));

    const auditRows = this.db.prepare(`
      SELECT
        audit_log.*,
        users.username
      FROM audit_log
      JOIN users ON users.id = audit_log.actor_user_id
      WHERE prompt_request_id = ?
      ORDER BY audit_log.id DESC
      LIMIT 20
    `).all(promptRequestId) as any[];

    const audit = auditRows.map((a) => ({
      id: a.id,
      actorUserId: a.actor_user_id,
      repositoryId: a.repository_id,
      promptRequestId: a.prompt_request_id,
      runId: a.run_id,
      action: a.action,
      details: a.details,
      createdAt: a.created_at,
      username: a.username,
    }));

    return { promptRequest, votes, runs, audit };
  }

  voteOnPromptRequest(userId: number, promptRequestId: number, input: z.input<typeof voteSchema>) {
    const parsed = voteSchema.parse(input);
    const promptRequest = this.getPromptRequestById(promptRequestId);
    if (!promptRequest) {
      throw new Error("Prompt Request not found");
    }
    if (promptRequest.status === "approved" || promptRequest.status === "rejected" || promptRequest.status === "closed") {
      throw new Error("Prompt Request is no longer accepting votes");
    }

    const tx = this.db.transaction(() => {
      const wallet = this.getWallet(userId);
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      if (wallet.availableCoins < parsed.coins) {
        throw new Error("Not enough coins");
      }

      this.db.prepare(`
        UPDATE wallets
        SET available_coins = available_coins - ?,
            lifetime_coins_spent = lifetime_coins_spent + ?
        WHERE user_id = ?
      `).run(parsed.coins, parsed.coins, userId);

      this.db.prepare(`
        INSERT INTO wallet_transactions (
          user_id, type, coins_delta, prompt_request_id, metadata
        ) VALUES (?, 'vote_commit', ?, ?, ?)
      `).run(userId, -parsed.coins, promptRequestId, JSON.stringify({ reason: "vote" }));

      this.db.prepare(`
        INSERT INTO prompt_request_votes (
          prompt_request_id, user_id, coins, remaining_coins, run_allocation_status
        ) VALUES (?, ?, ?, ?, 'reserved_for_future')
      `).run(promptRequestId, userId, parsed.coins, parsed.coins);

      this.db.prepare(`
        UPDATE prompt_requests
        SET total_coins_committed = total_coins_committed + ?,
            coins_available_for_next_run = coins_available_for_next_run + ?,
            updated_at = CURRENT_TIMESTAMP,
            status = CASE
              WHEN status IN ('open', 'queued', 'in_progress', 'awaiting_review') THEN status
              ELSE 'open'
            END
        WHERE id = ?
      `).run(parsed.coins, parsed.coins, promptRequestId);

      const refreshed = this.getPromptRequestById(promptRequestId);
      if (!refreshed) {
        throw new Error("Prompt Request disappeared");
      }
      this.logAction(userId, refreshed.repositoryId, promptRequestId, null, "prompt_request.voted", JSON.stringify({ coins: parsed.coins }));
      this.createRunsIfEligible(refreshed.id);
    });

    tx();
    return this.getPromptRequestDetails(promptRequestId);
  }

  createRunsIfEligible(promptRequestId: number) {
    while (true) {
      const promptRequest = this.getPromptRequestById(promptRequestId);
      if (!promptRequest) {
        return;
      }
      const activeRun = this.db.prepare(`
        SELECT * FROM agent_runs
        WHERE prompt_request_id = ?
          AND status IN ('queued', 'running')
        LIMIT 1
      `).get(promptRequestId) as AgentRun | undefined;

      if (activeRun || promptRequest.coinsAvailableForNextRun < RUN_THRESHOLD_COINS) {
        return;
      }
      this.createRun(promptRequest);
    }
  }

  private createRun(promptRequest: PromptRequest) {
    const tx = this.db.transaction(() => {
      const refreshed = this.getPromptRequestById(promptRequest.id);
      if (!refreshed || refreshed.coinsAvailableForNextRun < RUN_THRESHOLD_COINS) {
        return;
      }

      const runNumber = refreshed.currentRunNumber + 1;
      const result = this.db.prepare(`
        INSERT INTO agent_runs (
          prompt_request_id, run_number, status, coins_consumed
        ) VALUES (?, ?, 'queued', ?)
      `).run(refreshed.id, runNumber, RUN_THRESHOLD_COINS);
      const runId = Number(result.lastInsertRowid);

      let remaining = RUN_THRESHOLD_COINS;
      const voteRows = this.db.prepare(`
        SELECT * FROM prompt_request_votes
        WHERE prompt_request_id = ?
          AND remaining_coins > 0
          AND refunded_at IS NULL
        ORDER BY id ASC
      `).all(refreshed.id) as any[];

      for (const voteRow of voteRows) {
        if (remaining <= 0) {
          break;
        }
        const allocate = Math.min(voteRow.remaining_coins, remaining);
        this.db.prepare(`
          INSERT INTO run_vote_allocations (run_id, vote_id, user_id, coins_allocated)
          VALUES (?, ?, ?, ?)
        `).run(runId, voteRow.id, voteRow.user_id, allocate);

        const newRemaining = voteRow.remaining_coins - allocate;
        this.db.prepare(`
          UPDATE prompt_request_votes
          SET remaining_coins = ?,
              run_allocation_status = CASE
                WHEN ? = 0 THEN 'consumed_by_run'
                ELSE 'reserved_for_future'
              END,
              run_id = CASE
                WHEN ? = 0 THEN ?
                ELSE run_id
              END
          WHERE id = ?
        `).run(newRemaining, newRemaining, newRemaining, runId, voteRow.id);
        remaining -= allocate;
      }

      if (remaining !== 0) {
        throw new Error("Failed to allocate enough votes for run");
      }

      this.db.prepare(`
        UPDATE prompt_requests
        SET status = 'queued',
            coins_available_for_next_run = coins_available_for_next_run - ?,
            current_run_number = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(RUN_THRESHOLD_COINS, runNumber, refreshed.id);

      this.logAction(refreshed.authorUserId, refreshed.repositoryId, refreshed.id, runId, "agent_run.queued", JSON.stringify({ runNumber }));
    });
    tx();
  }

  listQueuedRuns() {
    return this.db.prepare(`
      SELECT agent_runs.*
      FROM agent_runs
      JOIN prompt_requests ON prompt_requests.id = agent_runs.prompt_request_id
      WHERE agent_runs.status = 'queued'
        AND prompt_requests.status = 'queued'
      ORDER BY agent_runs.id ASC
    `).all() as AgentRun[];
  }

  processQueuedRunsNow() {
    const runs = this.listQueuedRuns();
    for (const run of runs) {
      this.startRun(run.id);
      this.completeRun(run.id, {
        summary: `Agent produced a first pass for Prompt Request #${run.promptRequestId}. Review the repo and either approve, rerun with 10 new coins, or reject for refund.`,
        artifactUrl: `/prompt-requests/${run.promptRequestId}#run-${run.id}`,
        resultPayload: JSON.stringify({
          branch: `agent/run-${run.runNumber}`,
          note: "This is a simplified local prototype. The agent output is represented as structured metadata rather than a real code patch.",
        }),
      });
    }
  }

  startRun(runId: number) {
    const run = this.getRun(runId);
    if (!run || run.status !== "queued") {
      return;
    }

    this.db.prepare(`
      UPDATE agent_runs
      SET status = 'running'
      WHERE id = ?
    `).run(runId);

    this.db.prepare(`
      UPDATE prompt_requests
      SET status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(run.promptRequestId);
  }

  completeRun(runId: number, input: { summary: string; artifactUrl?: string; resultPayload?: string }) {
    const run = this.getRun(runId);
    if (!run || (run.status !== "queued" && run.status !== "running")) {
      return;
    }

    this.db.prepare(`
      UPDATE agent_runs
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          summary = ?,
          artifact_url = ?,
          result_payload = ?
      WHERE id = ?
    `).run(input.summary, input.artifactUrl ?? null, input.resultPayload ?? null, runId);

    this.db.prepare(`
      UPDATE prompt_requests
      SET status = 'awaiting_review',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(run.promptRequestId);
  }

  approveRun(actorUserId: number, runId: number) {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }
    const promptRequest = this.getPromptRequestById(run.promptRequestId);
    if (!promptRequest) {
      throw new Error("Prompt Request not found");
    }
    this.assertMaintainer(actorUserId, promptRequest.repositoryId);

    if (run.status === "approved") {
      return;
    }
    if (run.status !== "completed" && run.status !== "rerun_requested") {
      throw new Error("Run is not reviewable");
    }

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE agent_runs
        SET status = 'approved',
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(runId);

      this.db.prepare(`
        UPDATE prompt_requests
        SET status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(promptRequest.id);

      this.logAction(actorUserId, promptRequest.repositoryId, promptRequest.id, runId, "agent_run.approved", null);
    });
    tx();
  }

  rerunRequest(actorUserId: number, runId: number) {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }
    const promptRequest = this.getPromptRequestById(run.promptRequestId);
    if (!promptRequest) {
      throw new Error("Prompt Request not found");
    }
    this.assertMaintainer(actorUserId, promptRequest.repositoryId);
    if (run.status !== "completed" && run.status !== "rerun_requested") {
      throw new Error("Run cannot be rerun");
    }

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE agent_runs
        SET status = 'rerun_requested',
            reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP)
        WHERE id = ?
      `).run(runId);

      this.db.prepare(`
        UPDATE prompt_requests
        SET status = 'open',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(promptRequest.id);

      this.logAction(actorUserId, promptRequest.repositoryId, promptRequest.id, runId, "agent_run.rerun_requested", null);
      this.createRunsIfEligible(promptRequest.id);
    });
    tx();
  }

  rejectRun(actorUserId: number, runId: number) {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }
    const promptRequest = this.getPromptRequestById(run.promptRequestId);
    if (!promptRequest) {
      throw new Error("Prompt Request not found");
    }
    this.assertMaintainer(actorUserId, promptRequest.repositoryId);
    if (run.status === "rejected") {
      return;
    }
    if (run.status !== "completed" && run.status !== "rerun_requested") {
      throw new Error("Run is not rejectable");
    }

    const tx = this.db.transaction(() => {
      const allocations = this.db.prepare(`
        SELECT * FROM run_vote_allocations
        WHERE run_id = ?
          AND refunded_at IS NULL
        ORDER BY id ASC
      `).all(runId) as Array<{ id: number; user_id: number; coins_allocated: number; vote_id: number }>;

      for (const allocation of allocations) {
        this.db.prepare(`
          UPDATE wallets
          SET available_coins = available_coins + ?,
              lifetime_coins_spent = lifetime_coins_spent - ?
          WHERE user_id = ?
        `).run(allocation.coins_allocated, allocation.coins_allocated, allocation.user_id);

        this.db.prepare(`
          INSERT INTO wallet_transactions (
            user_id, type, coins_delta, prompt_request_id, run_id, metadata
          ) VALUES (?, 'refund', ?, ?, ?, ?)
        `).run(
          allocation.user_id,
          allocation.coins_allocated,
          promptRequest.id,
          runId,
          JSON.stringify({ voteId: allocation.vote_id }),
        );

        this.db.prepare(`
          UPDATE run_vote_allocations
          SET refunded_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(allocation.id);
      }

      this.db.prepare(`
        UPDATE prompt_request_votes
        SET run_allocation_status = 'refunded',
            refunded_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT vote_id FROM run_vote_allocations WHERE run_id = ?
        )
      `).run(runId);

      this.db.prepare(`
        UPDATE agent_runs
        SET status = 'rejected',
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(runId);

      this.db.prepare(`
        UPDATE prompt_requests
        SET status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(promptRequest.id);

      this.logAction(actorUserId, promptRequest.repositoryId, promptRequest.id, runId, "agent_run.rejected", JSON.stringify({ refundedCoins: run.coinsConsumed }));
    });
    tx();
  }

  purchaseCoins(userId: number, packId: string) {
    const pack = COIN_PACKS.find((item) => item.id === packId);
    if (!pack) {
      throw new Error("Coin pack not found");
    }

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE wallets
        SET available_coins = available_coins + ?,
            lifetime_coins_purchased = lifetime_coins_purchased + ?
        WHERE user_id = ?
      `).run(pack.coins, pack.coins, userId);

      this.db.prepare(`
        INSERT INTO wallet_transactions (
          user_id, type, coins_delta, usd_amount_cents, metadata
        ) VALUES (?, 'purchase', ?, ?, ?)
      `).run(userId, pack.coins, pack.usdCents, JSON.stringify({ packId: pack.id }));
    });
    tx();
  }

  getRun(runId: number): AgentRun | undefined {
    const row = this.db.prepare("SELECT * FROM agent_runs WHERE id = ?").get(runId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      promptRequestId: row.prompt_request_id,
      runNumber: row.run_number,
      status: row.status,
      coinsConsumed: row.coins_consumed,
      triggeredAt: row.triggered_at,
      completedAt: row.completed_at,
      reviewedAt: row.reviewed_at,
      artifactUrl: row.artifact_url,
      resultPayload: row.result_payload,
      summary: row.summary,
      failureReason: row.failure_reason,
    } as AgentRun;
  }

  getHomeData() {
    const repositories = this.listRepositories();
    const topPromptRequests = this.db.prepare(`
      SELECT
        prompt_requests.*,
        repositories.slug AS repository_slug,
        repositories.name AS repository_name,
        users.username AS author_username
      FROM prompt_requests
      JOIN repositories ON repositories.id = prompt_requests.repository_id
      JOIN users ON users.id = prompt_requests.author_user_id
      ORDER BY
        prompt_requests.coins_available_for_next_run DESC,
        prompt_requests.total_coins_committed DESC,
        prompt_requests.updated_at DESC
      LIMIT 12
    `).all() as Array<PromptRequest & { repository_slug: string; repository_name: string; author_username: string }>;

    return {
      repositories,
      topPromptRequests,
      coinPacks: COIN_PACKS,
    };
  }

  private assertMaintainer(actorUserId: number, repositoryId: number) {
    const repository = this.getRepositoryById(repositoryId);
    if (!repository || repository.maintainerUserId !== actorUserId) {
      throw new Error("Maintainer access required");
    }
  }

  private logAction(
    actorUserId: number,
    repositoryId: number | null,
    promptRequestId: number | null,
    runId: number | null,
    action: string,
    details: string | null,
  ) {
    this.db.prepare(`
      INSERT INTO audit_log (
        actor_user_id, repository_id, prompt_request_id, run_id, action, details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(actorUserId, repositoryId, promptRequestId, runId, action, details);
  }
}


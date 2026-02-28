import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

const STARTER_COINS = 50;
const RUN_THRESHOLD_COINS = 10;

// Helper to get current timestamp
const now = () => new Date().toISOString();

// Users
export const createUser = mutation({
  args: {
    username: v.string(),
    email: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      starterCoinsGrantedAt: now(),
      role: "user",
      createdAt: now(),
    });

    // Create wallet with starter coins
    await ctx.db.insert("wallets", {
      userId,
      availableCoins: STARTER_COINS,
      lifetimeCoinsPurchased: 0,
      lifetimeCoinsGranted: STARTER_COINS,
      lifetimeCoinsSpent: 0,
    });

    // Log transaction
    await ctx.db.insert("walletTransactions", {
      userId,
      type: "signup_grant",
      coinsDelta: STARTER_COINS,
      metadata: JSON.stringify({ source: "signup" }),
      createdAt: now(),
    });

    return userId;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

// Wallets
export const getWallet = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getWalletTransactions = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("walletTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const purchaseCoins = mutation({
  args: {
    userId: v.id("users"),
    packId: v.string(),
    coins: v.number(),
    usdCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!wallet) throw new Error("Wallet not found");

    await ctx.db.patch(wallet._id, {
      availableCoins: wallet.availableCoins + args.coins,
      lifetimeCoinsPurchased: wallet.lifetimeCoinsPurchased + args.coins,
    });

    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      type: "purchase",
      coinsDelta: args.coins,
      usdAmountCents: args.usdCents,
      metadata: JSON.stringify({ packId: args.packId }),
      createdAt: now(),
    });
  },
});

// Repositories
export const createRepository = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    maintainerUserId: v.id("users"),
    bareRepoPath: v.string(),
    cloneUrl: v.string(),
  },
  returns: v.id("repositories"),
  handler: async (ctx, args) => {
    // Update user role to maintainer
    const user = await ctx.db.get(args.maintainerUserId);
    if (user) {
      await ctx.db.patch(args.maintainerUserId, { role: "maintainer" });
    }

    const repoId = await ctx.db.insert("repositories", {
      slug: args.slug,
      name: args.name,
      description: args.description,
      visibility: "public",
      maintainerUserId: args.maintainerUserId,
      bareRepoPath: args.bareRepoPath,
      cloneUrl: args.cloneUrl,
      defaultBranch: "main",
      agentEnabled: true,
      createdAt: now(),
    });

    // Log action
    await ctx.db.insert("auditLog", {
      actorUserId: args.maintainerUserId,
      repositoryId: repoId,
      action: "repository.created",
      details: JSON.stringify({ slug: args.slug }),
      createdAt: now(),
    });

    return repoId;
  },
});

export const getRepositoryBySlug = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getRepositoryById = query({
  args: { repoId: v.id("repositories") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.repoId);
  },
});

export const listRepositories = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("repositories").order("desc").take(100);
  },
});

// Prompt Requests
export const createPromptRequest = mutation({
  args: {
    repositoryId: v.id("repositories"),
    authorUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  returns: v.id("promptRequests"),
  handler: async (ctx, args) => {
    const prId = await ctx.db.insert("promptRequests", {
      repositoryId: args.repositoryId,
      authorUserId: args.authorUserId,
      title: args.title,
      body: args.body,
      status: "open",
      totalCoinsCommitted: 0,
      coinsAvailableForNextRun: 0,
      currentRunNumber: 0,
      createdAt: now(),
      updatedAt: now(),
    });

    await ctx.db.insert("auditLog", {
      actorUserId: args.authorUserId,
      repositoryId: args.repositoryId,
      promptRequestId: prId,
      action: "prompt_request.created",
      createdAt: now(),
    });

    return prId;
  },
});

export const getPromptRequestById = query({
  args: { prId: v.id("promptRequests") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.prId);
  },
});

export const listPromptRequestsByRepository = query({
  args: { repositoryId: v.id("repositories") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptRequests")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .take(100);
  },
});

// Voting
export const voteOnPromptRequest = mutation({
  args: {
    userId: v.id("users"),
    promptRequestId: v.id("promptRequests"),
    coins: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pr = await ctx.db.get(args.promptRequestId);
    if (!pr) throw new Error("Prompt Request not found");
    if (["approved", "rejected", "closed"].includes(pr.status)) {
      throw new Error("Prompt Request is no longer accepting votes");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!wallet) throw new Error("Wallet not found");
    if (wallet.availableCoins < args.coins) {
      throw new Error("Not enough coins");
    }

    // Deduct coins from wallet
    await ctx.db.patch(wallet._id, {
      availableCoins: wallet.availableCoins - args.coins,
      lifetimeCoinsSpent: wallet.lifetimeCoinsSpent + args.coins,
    });

    // Create vote
    await ctx.db.insert("promptRequestVotes", {
      promptRequestId: args.promptRequestId,
      userId: args.userId,
      coins: args.coins,
      remainingCoins: args.coins,
      runAllocationStatus: "reserved_for_future",
      createdAt: now(),
    });

    // Update prompt request
    await ctx.db.patch(args.promptRequestId, {
      totalCoinsCommitted: pr.totalCoinsCommitted + args.coins,
      coinsAvailableForNextRun: pr.coinsAvailableForNextRun + args.coins,
      updatedAt: now(),
    });

    // Log transaction
    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      type: "vote_commit",
      coinsDelta: -args.coins,
      promptRequestId: args.promptRequestId,
      metadata: JSON.stringify({ reason: "vote" }),
      createdAt: now(),
    });

    // Log action
    await ctx.db.insert("auditLog", {
      actorUserId: args.userId,
      repositoryId: pr.repositoryId,
      promptRequestId: args.promptRequestId,
      action: "prompt_request.voted",
      details: JSON.stringify({ coins: args.coins }),
      createdAt: now(),
    });

    // Check if we can create a run
    await ctx.runMutation(api.gitai.createRunsIfEligible, {
      promptRequestId: args.promptRequestId,
    });
  },
});

// Agent Runs
export const createRunsIfEligible = internalMutation({
  args: { promptRequestId: v.id("promptRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    while (true) {
      const pr = await ctx.db.get(args.promptRequestId);
      if (!pr) return;

      // Check for active runs
      const activeRuns = await ctx.db
        .query("agentRuns")
        .withIndex("by_prompt_request", (q) =>
          q.eq("promptRequestId", args.promptRequestId)
        )
        .filter((q) =>
          q.or(q.eq(q.field("status"), "queued"), q.eq(q.field("status"), "running"))
        )
        .first();

      if (activeRuns || pr.coinsAvailableForNextRun < RUN_THRESHOLD_COINS) {
        return;
      }

      // Create a run
      const runNumber = pr.currentRunNumber + 1;
      const runId = await ctx.db.insert("agentRuns", {
        promptRequestId: args.promptRequestId,
        runNumber,
        status: "queued",
        coinsConsumed: RUN_THRESHOLD_COINS,
        triggeredAt: now(),
      });

      // Allocate votes
      let remaining = RUN_THRESHOLD_COINS;
      const votes = await ctx.db
        .query("promptRequestVotes")
        .withIndex("by_prompt_request", (q) =>
          q.eq("promptRequestId", args.promptRequestId)
        )
        .filter((q) =>
          q.and(
            q.gt(q.field("remainingCoins"), 0),
            q.eq(q.field("refundedAt"), undefined)
          )
        )
        .take(100);

      for (const vote of votes) {
        if (remaining <= 0) break;
        const allocate = Math.min(vote.remainingCoins, remaining);

        await ctx.db.insert("runVoteAllocations", {
          runId,
          voteId: vote._id,
          userId: vote.userId,
          coinsAllocated: allocate,
        });

        const newRemaining = vote.remainingCoins - allocate;
        await ctx.db.patch(vote._id, {
          remainingCoins: newRemaining,
          runAllocationStatus: newRemaining === 0 ? "consumed_by_run" : "reserved_for_future",
          runId: newRemaining === 0 ? runId : vote.runId,
        });

        remaining -= allocate;
      }

      if (remaining !== 0) {
        throw new Error("Failed to allocate enough votes for run");
      }

      // Update prompt request
      await ctx.db.patch(args.promptRequestId, {
        status: "queued",
        coinsAvailableForNextRun: pr.coinsAvailableForNextRun - RUN_THRESHOLD_COINS,
        currentRunNumber: runNumber,
        updatedAt: now(),
      });

      // Log action
      await ctx.db.insert("auditLog", {
        actorUserId: pr.authorUserId,
        repositoryId: pr.repositoryId,
        promptRequestId: args.promptRequestId,
        runId,
        action: "agent_run.queued",
        details: JSON.stringify({ runNumber }),
        createdAt: now(),
      });
    }
  },
});

export const startRun = mutation({
  args: { runId: v.id("agentRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "queued") return;

    await ctx.db.patch(args.runId, { status: "running" });

    const pr = await ctx.db.get(run.promptRequestId);
    if (pr) {
      await ctx.db.patch(run.promptRequestId, {
        status: "in_progress",
        updatedAt: now(),
      });
    }
  },
});

export const completeRun = mutation({
  args: {
    runId: v.id("agentRuns"),
    summary: v.string(),
    artifactUrl: v.optional(v.string()),
    resultPayload: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || (run.status !== "queued" && run.status !== "running")) return;

    await ctx.db.patch(args.runId, {
      status: "completed",
      completedAt: now(),
      summary: args.summary,
      artifactUrl: args.artifactUrl,
      resultPayload: args.resultPayload,
    });

    const pr = await ctx.db.get(run.promptRequestId);
    if (pr) {
      await ctx.db.patch(run.promptRequestId, {
        status: "awaiting_review",
        updatedAt: now(),
      });
    }
  },
});

export const approveRun = mutation({
  args: { actorUserId: v.id("users"), runId: v.id("agentRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const pr = await ctx.db.get(run.promptRequestId);
    if (!pr) throw new Error("Prompt Request not found");

    // Verify maintainer
    const repo = await ctx.db.get(pr.repositoryId);
    if (!repo || repo.maintainerUserId !== args.actorUserId) {
      throw new Error("Maintainer access required");
    }

    if (run.status === "approved") return;
    if (!["completed", "rerun_requested"].includes(run.status)) {
      throw new Error("Run is not reviewable");
    }

    await ctx.db.patch(args.runId, {
      status: "approved",
      reviewedAt: now(),
    });

    await ctx.db.patch(run.promptRequestId, {
      status: "approved",
      updatedAt: now(),
    });

    await ctx.db.insert("auditLog", {
      actorUserId: args.actorUserId,
      repositoryId: pr.repositoryId,
      promptRequestId: run.promptRequestId,
      runId: args.runId,
      action: "agent_run.approved",
      createdAt: now(),
    });
  },
});

export const rejectRun = mutation({
  args: { actorUserId: v.id("users"), runId: v.id("agentRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const pr = await ctx.db.get(run.promptRequestId);
    if (!pr) throw new Error("Prompt Request not found");

    // Verify maintainer
    const repo = await ctx.db.get(pr.repositoryId);
    if (!repo || repo.maintainerUserId !== args.actorUserId) {
      throw new Error("Maintainer access required");
    }

    if (run.status === "rejected") return;
    if (!["completed", "rerun_requested"].includes(run.status)) {
      throw new Error("Run is not rejectable");
    }

    // Refund allocations
    const allocations = await ctx.db
      .query("runVoteAllocations")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .filter((q) => q.eq(q.field("refundedAt"), undefined))
      .take(100);

    for (const allocation of allocations) {
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("by_user", (q) => q.eq("userId", allocation.userId))
        .first();

      if (wallet) {
        await ctx.db.patch(wallet._id, {
          availableCoins: wallet.availableCoins + allocation.coinsAllocated,
          lifetimeCoinsSpent: wallet.lifetimeCoinsSpent - allocation.coinsAllocated,
        });
      }

      await ctx.db.insert("walletTransactions", {
        userId: allocation.userId,
        type: "refund",
        coinsDelta: allocation.coinsAllocated,
        promptRequestId: run.promptRequestId,
        runId: args.runId,
        metadata: JSON.stringify({ voteId: allocation.voteId }),
        createdAt: now(),
      });

      await ctx.db.patch(allocation._id, { refundedAt: now() });
    }

    // Mark votes as refunded
    const voteIds = allocations.map((a) => a.voteId);
    for (const voteId of voteIds) {
      await ctx.db.patch(voteId, {
        runAllocationStatus: "refunded",
        refundedAt: now(),
      });
    }

    await ctx.db.patch(args.runId, {
      status: "rejected",
      reviewedAt: now(),
    });

    await ctx.db.patch(run.promptRequestId, {
      status: "rejected",
      updatedAt: now(),
    });

    await ctx.db.insert("auditLog", {
      actorUserId: args.actorUserId,
      repositoryId: pr.repositoryId,
      promptRequestId: run.promptRequestId,
      runId: args.runId,
      action: "agent_run.rejected",
      details: JSON.stringify({ refundedCoins: run.coinsConsumed }),
      createdAt: now(),
    });
  },
});

export const rerunRequest = mutation({
  args: { actorUserId: v.id("users"), runId: v.id("agentRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Run not found");

    const pr = await ctx.db.get(run.promptRequestId);
    if (!pr) throw new Error("Prompt Request not found");

    // Verify maintainer
    const repo = await ctx.db.get(pr.repositoryId);
    if (!repo || repo.maintainerUserId !== args.actorUserId) {
      throw new Error("Maintainer access required");
    }

    if (!["completed", "rerun_requested"].includes(run.status)) {
      throw new Error("Run cannot be rerun");
    }

    await ctx.db.patch(args.runId, {
      status: "rerun_requested",
      reviewedAt: run.reviewedAt || now(),
    });

    await ctx.db.patch(run.promptRequestId, {
      status: "open",
      updatedAt: now(),
    });

    await ctx.db.insert("auditLog", {
      actorUserId: args.actorUserId,
      repositoryId: pr.repositoryId,
      promptRequestId: run.promptRequestId,
      runId: args.runId,
      action: "agent_run.rerun_requested",
      createdAt: now(),
    });

    // Check if we can create a new run
    await ctx.runMutation(api.gitai.createRunsIfEligible, {
      promptRequestId: run.promptRequestId,
    });
  },
});

export const listQueuedRuns = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .take(100);
  },
});

export const getRunsByPromptRequest = query({
  args: { promptRequestId: v.id("promptRequests") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_prompt_request", (q) =>
        q.eq("promptRequestId", args.promptRequestId)
      )
      .order("desc")
      .take(100);
  },
});

// Audit Log
export const getAuditLogByPromptRequest = query({
  args: { promptRequestId: v.id("promptRequests") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLog")
      .withIndex("by_prompt_request", (q) =>
        q.eq("promptRequestId", args.promptRequestId)
      )
      .order("desc")
      .take(20);
  },
});

// Votes
export const getVotesByPromptRequest = query({
  args: { promptRequestId: v.id("promptRequests") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptRequestVotes")
      .withIndex("by_prompt_request", (q) =>
        q.eq("promptRequestId", args.promptRequestId)
      )
      .order("asc")
      .take(100);
  },
});

// Home data
export const getHomeData = query({
  args: {},
  returns: v.object({
    repositories: v.array(v.any()),
    topPromptRequests: v.array(v.any()),
  }),
  handler: async (ctx) => {
    const repositories = await ctx.db
      .query("repositories")
      .order("desc")
      .take(20);

    const topPromptRequests = await ctx.db
      .query("promptRequests")
      .order("desc")
      .take(12);

    return { repositories, topPromptRequests };
  },
});

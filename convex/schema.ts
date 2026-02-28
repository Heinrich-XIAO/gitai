import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    email: v.string(),
    starterCoinsGrantedAt: v.optional(v.string()),
    role: v.string(),
    createdAt: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  wallets: defineTable({
    userId: v.id("users"),
    availableCoins: v.number(),
    lifetimeCoinsPurchased: v.number(),
    lifetimeCoinsGranted: v.number(),
    lifetimeCoinsSpent: v.number(),
  }).index("by_user", ["userId"]),

  walletTransactions: defineTable({
    userId: v.id("users"),
    type: v.string(),
    coinsDelta: v.number(),
    usdAmountCents: v.optional(v.number()),
    promptRequestId: v.optional(v.id("promptRequests")),
    runId: v.optional(v.id("agentRuns")),
    metadata: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

  repositories: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    visibility: v.string(),
    maintainerUserId: v.id("users"),
    bareRepoPath: v.string(),
    cloneUrl: v.string(),
    defaultBranch: v.string(),
    agentEnabled: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_maintainer", ["maintainerUserId"]),

  promptRequests: defineTable({
    repositoryId: v.id("repositories"),
    authorUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
    status: v.string(),
    totalCoinsCommitted: v.number(),
    coinsAvailableForNextRun: v.number(),
    currentRunNumber: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_author", ["authorUserId"])
    .index("by_status", ["status"]),

  promptRequestVotes: defineTable({
    promptRequestId: v.id("promptRequests"),
    userId: v.id("users"),
    coins: v.number(),
    remainingCoins: v.number(),
    runAllocationStatus: v.string(),
    runId: v.optional(v.id("agentRuns")),
    createdAt: v.string(),
    refundedAt: v.optional(v.string()),
  })
    .index("by_prompt_request", ["promptRequestId"])
    .index("by_user", ["userId"]),

  agentRuns: defineTable({
    promptRequestId: v.id("promptRequests"),
    runNumber: v.number(),
    status: v.string(),
    coinsConsumed: v.number(),
    triggeredAt: v.string(),
    completedAt: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
    artifactUrl: v.optional(v.string()),
    resultPayload: v.optional(v.string()),
    summary: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  })
    .index("by_prompt_request", ["promptRequestId"])
    .index("by_status", ["status"]),

  runVoteAllocations: defineTable({
    runId: v.id("agentRuns"),
    voteId: v.id("promptRequestVotes"),
    userId: v.id("users"),
    coinsAllocated: v.number(),
    refundedAt: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_vote", ["voteId"]),

  auditLog: defineTable({
    actorUserId: v.id("users"),
    repositoryId: v.optional(v.id("repositories")),
    promptRequestId: v.optional(v.id("promptRequests")),
    runId: v.optional(v.id("agentRuns")),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_prompt_request", ["promptRequestId"]),
});

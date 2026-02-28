export type UserRole = "user" | "maintainer" | "admin";

export type PromptRequestStatus =
  | "open"
  | "queued"
  | "in_progress"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "closed";

export type VoteAllocationStatus =
  | "reserved_for_future"
  | "consumed_by_run"
  | "refunded";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "approved"
  | "rerun_requested"
  | "rejected"
  | "failed";

export type WalletTransactionType =
  | "signup_grant"
  | "purchase"
  | "vote_commit"
  | "refund"
  | "admin_adjustment";

export interface User {
  id: number;
  username: string;
  email: string;
  starterCoinsGrantedAt: string | null;
  role: UserRole;
  createdAt: string;
}

export interface Wallet {
  userId: number;
  availableCoins: number;
  lifetimeCoinsPurchased: number;
  lifetimeCoinsGranted: number;
  lifetimeCoinsSpent: number;
}

export interface WalletTransaction {
  id: number;
  userId: number;
  type: WalletTransactionType;
  coinsDelta: number;
  usdAmountCents: number | null;
  promptRequestId: number | null;
  runId: number | null;
  metadata: string | null;
  createdAt: string;
}

export interface Repository {
  id: number;
  slug: string;
  name: string;
  description: string;
  visibility: "public";
  maintainerUserId: number;
  bareRepoPath: string;
  cloneUrl: string;
  defaultBranch: string;
  agentEnabled: number;
  createdAt: string;
}

export interface PromptRequest {
  id: number;
  repositoryId: number;
  authorUserId: number;
  title: string;
  body: string;
  status: PromptRequestStatus;
  totalCoinsCommitted: number;
  coinsAvailableForNextRun: number;
  currentRunNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptRequestVote {
  id: number;
  promptRequestId: number;
  userId: number;
  coins: number;
  remainingCoins: number;
  runAllocationStatus: VoteAllocationStatus;
  runId: number | null;
  createdAt: string;
  refundedAt: string | null;
}

export interface AgentRun {
  id: number;
  promptRequestId: number;
  runNumber: number;
  status: AgentRunStatus;
  coinsConsumed: number;
  triggeredAt: string;
  completedAt: string | null;
  reviewedAt: string | null;
  artifactUrl: string | null;
  resultPayload: string | null;
  summary: string | null;
  failureReason: string | null;
}

export interface AuditLogEntry {
  id: number;
  actorUserId: number;
  repositoryId: number | null;
  promptRequestId: number | null;
  runId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
}


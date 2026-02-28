# GitAI Spec

## Product Summary

GitAI is a simple git hosting platform built for agents.

It combines three primitives in one product:

1. Real git repository hosting
2. Prompt Requests that ask the agent to change a repo
3. Coin-weighted demand that decides what the agent should work on next

The product is intentionally smaller than GitHub. The goal is not full GitHub parity in v1. The goal is a minimal, coherent system where a user can:

- create an account
- create a repository that is actually hosted by GitAI
- view clone URLs, branches, and commits
- open a Prompt Request against that repository
- spend coins to support a Prompt Request
- trigger an agent run once a request reaches 10 coins
- review the result as the repository maintainer

## Core Product Principles

- Git hosting is required in v1.
- The platform must store actual git repositories on disk.
- The product should stay simple and avoid GitHub-scale scope.
- Prompt Requests are first-class, agent-native work items.
- Coins are both votes and spendable platform currency.
- Only the GitAI platform agent fulfills Prompt Requests in v1.
- All v1 repositories are public.

## v1 Scope

### In scope

- account creation
- lightweight login
- platform-wide wallet
- starter coin grant
- coin purchases
- public repository creation
- local git repository hosting using bare repositories
- repository pages with clone URL, branch list, and recent commits
- Prompt Request creation and browsing
- coin voting on Prompt Requests
- automatic agent run creation at 10 committed coins
- maintainer review actions: approve, rerun, reject
- refund on rejection only
- audit log for maintainer and run events

### Out of scope

- private repositories
- team permissions beyond a single maintainer
- SSH auth for git push/pull
- HTTP smart git protocol
- code browsing with rich diffs
- human-submitted pull requests
- merge queue
- branch protection rules
- CI/CD
- webhook integrations
- marketplace payouts to users
- revenue sharing
- multiple agents

## Primary User Flows

### 1. Signup and starter wallet

- User signs up with username and email
- GitAI creates a wallet automatically
- User receives 50 starter coins exactly once

### 2. Create repository

- Signed-in user creates a repository with name, slug, and description
- GitAI creates a bare git repository on disk
- GitAI seeds it with an initial commit
- Repository page shows:
  - clone URL
  - current HEAD
  - branches
  - recent commits

### 3. Create Prompt Request

- Authenticated user opens a Prompt Request on a repository
- Prompt Request starts open with zero committed coins

### 4. Vote with coins

- Any authenticated user can spend coins on a Prompt Request
- Spending coins immediately reduces wallet balance
- Votes are cumulative and public
- Once 10 coins are available for the next run, the system creates an agent run

### 5. Agent run lifecycle

- A qualifying Prompt Request creates a queued run
- The platform agent processes queued runs
- On completion, the run moves to awaiting review
- The maintainer can:
  - approve
  - rerun
  - reject

### 6. Review outcomes

#### Approve

- run becomes approved
- Prompt Request becomes approved/final
- no refund

#### Rerun

- current run becomes rerun requested
- Prompt Request reopens
- another 10 newly committed coins are required
- once funded, a new run starts

#### Reject

- run becomes rejected
- only the most recent run tranche of 10 coins is refunded
- refunded coins go back to the original contributing users
- Prompt Request becomes rejected and non-runnable in v1

## Economy Rules

- starter grant: 50 coins once per user
- exchange rate: 10 coins = $1
- default packs:
  - 100 coins for $10
  - 500 coins for $50
  - 1000 coins for $100
- users can spend coins on their own requests
- coins are committed at vote time, not at execution time
- only explicit rejection causes refund
- revenue belongs to GitAI

## Repository Model

Each repository has:

- `id`
- `slug`
- `name`
- `description`
- `visibility` fixed to `public`
- `maintainerUserId`
- `bareRepoPath`
- `cloneUrl`
- `defaultBranch`
- `agentEnabled`
- `createdAt`

Repository hosting design for v1:

- repositories are stored as bare repos under `data/repos/<slug>.git`
- seeding uses a temporary working directory and pushes an initial commit to the bare repo
- clone URL can be a local file URL in the prototype
- v1 does not need network git transport to validate the product model

## Prompt Request Model

Each Prompt Request has:

- `id`
- `repositoryId`
- `authorUserId`
- `title`
- `body`
- `status`
- `totalCoinsCommitted`
- `coinsAvailableForNextRun`
- `currentRunNumber`
- `createdAt`
- `updatedAt`

Statuses:

- `open`
- `queued`
- `in_progress`
- `awaiting_review`
- `approved`
- `rejected`
- `closed`

## Vote and Allocation Model

Each vote stores:

- `promptRequestId`
- `userId`
- `coins`
- `remainingCoins`
- `runAllocationStatus`
- `runId`
- `createdAt`
- `refundedAt`

Rules:

- votes are consumed FIFO into run tranches
- every run consumes exactly 10 coins
- allocations must be traceable back to original voters
- refunds must be based on actual allocations, not percentages computed later

This requires a run allocation table that maps vote rows to run rows and exact allocated coin counts.

## Agent Run Model

Each run has:

- `promptRequestId`
- `runNumber`
- `status`
- `coinsConsumed`
- `triggeredAt`
- `completedAt`
- `reviewedAt`
- `artifactUrl`
- `resultPayload`
- `summary`
- `failureReason`

Statuses:

- `queued`
- `running`
- `completed`
- `approved`
- `rerun_requested`
- `rejected`
- `failed`

## System Invariants

- wallet balance can never go negative
- starter grant can happen only once
- vote commit and wallet deduction must be atomic
- run creation and vote allocation must be atomic
- refund must be atomic and idempotent
- a Prompt Request cannot have two active runs at once
- approved and rejected are terminal outcomes for a run
- rejected refunds apply only to that run’s allocated 10 coins

## API Surface

### Auth and user

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /me/wallet`
- `GET /me/wallet/transactions`

### Repositories

- `GET /repositories`
- `POST /repositories`
- `GET /repositories/:slug`

### Prompt Requests

- `POST /repositories/:repositoryId/prompt-requests`
- `GET /prompt-requests/:id`
- `GET /prompt-requests/:id/votes`
- `POST /prompt-requests/:id/vote`

### Agent runs

- `GET /prompt-requests/:id/runs`
- `POST /prompt-requests/:id/runs/:runId/approve`
- `POST /prompt-requests/:id/runs/:runId/reject`
- `POST /prompt-requests/:id/runs/:runId/rerun-request`
- `POST /internal/agent-runs/process`

### Billing

- `GET /wallet/purchase-options`
- `POST /wallet/purchase`

For the prototype, `POST /wallet/purchase` can simulate a successful purchase immediately instead of integrating a real payment provider.

## UI Surface

### Home page

- product summary
- top repositories
- top Prompt Requests
- coin purchase CTA

### Repository page

- repository metadata
- clone URL
- branch list
- recent commits
- Prompt Requests
- create Prompt Request form

### Prompt Request page

- title and description
- author
- total committed coins
- progress toward next run
- vote controls
- run history
- audit activity
- maintainer review controls

### Wallet page

- current balance
- transaction history
- purchase options

## Technical Approach

v1 should be implemented as a single-process TypeScript application with:

- Express for the web server
- SQLite for persistence
- `better-sqlite3` for synchronous transactional integrity
- server-rendered HTML for speed of implementation
- local disk storage for hosted git repos
- shelling out to `git` for repository operations

This is the intended simplification strategy:

- keep backend and UI in one app
- keep auth simple
- keep git transport local for prototype validation
- model the core state machine correctly before adding polish

## Testing Requirements

### Unit tests

- signup grants 50 coins once
- wallet purchase increases balance correctly
- vote fails on insufficient balance
- 10th committed coin creates exactly one run
- concurrent-style repeated votes do not create duplicate active runs
- rerun requires 10 new coins
- reject refunds only the rejected run tranche
- approve does not refund
- wallet never becomes negative

### Integration tests

- user signs up, creates repo, repo has initial commit
- user opens Prompt Request and self-funds to 10 coins
- queued run is processed and moves to awaiting review
- maintainer approves run
- maintainer rejects run and voters receive exact refunds
- maintainer requests rerun and request waits for new 10 coins

## Implementation Order

1. App skeleton and SQLite schema
2. Auth, users, wallets, transactions
3. Bare repository hosting and repository pages
4. Prompt Request CRUD
5. Voting and run allocation logic
6. Agent run processor
7. Maintainer review actions
8. Wallet purchase simulation
9. Tests
10. UI refinement

## Success Criteria for v1

The product is successful if a user can:

1. sign up and receive 50 coins
2. create a repository that exists as a real git repo on disk
3. open a Prompt Request against that repository
4. spend coins on that Prompt Request
5. automatically trigger an agent run at 10 coins
6. review the run as maintainer
7. see correct wallet and refund behavior

## Current Build Direction

The implementation should optimize for correctness of the state machine and simplicity of hosting, not for production-scale git infrastructure.

"Built for agents" in v1 means:

- repositories are the center of the product
- Prompt Requests are native to the repository
- agent work is triggered by demand, not manual ticket triage
- maintainer review is integrated into the same repository flow

## Appendix A: Database Schema Reference

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | NOT NULL UNIQUE |
| email | TEXT | NOT NULL UNIQUE |
| starter_coins_granted_at | TEXT | nullable |
| role | TEXT | NOT NULL DEFAULT 'user' |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |

### wallets
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | INTEGER | PRIMARY KEY, FOREIGN KEY users(id) |
| available_coins | INTEGER | NOT NULL DEFAULT 0 CHECK (>= 0) |
| lifetime_coins_purchased | INTEGER | NOT NULL DEFAULT 0 |
| lifetime_coins_granted | INTEGER | NOT NULL DEFAULT 0 |
| lifetime_coins_spent | INTEGER | NOT NULL DEFAULT 0 |

### wallet_transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| type | TEXT | NOT NULL |
| coins_delta | INTEGER | NOT NULL |
| usd_amount_cents | INTEGER | nullable |
| prompt_request_id | INTEGER | nullable |
| run_id | INTEGER | nullable |
| metadata | TEXT | nullable |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |

### repositories
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| slug | TEXT | NOT NULL UNIQUE |
| name | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| visibility | TEXT | NOT NULL DEFAULT 'public' |
| maintainer_user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| bare_repo_path | TEXT | NOT NULL UNIQUE |
| clone_url | TEXT | NOT NULL |
| default_branch | TEXT | NOT NULL DEFAULT 'main' |
| agent_enabled | INTEGER | NOT NULL DEFAULT 1 |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |

### prompt_requests
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| repository_id | INTEGER | NOT NULL, FOREIGN KEY repositories(id) |
| author_user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| title | TEXT | NOT NULL |
| body | TEXT | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'open' |
| total_coins_committed | INTEGER | NOT NULL DEFAULT 0 |
| coins_available_for_next_run | INTEGER | NOT NULL DEFAULT 0 |
| current_run_number | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |

### prompt_request_votes
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| prompt_request_id | INTEGER | NOT NULL, FOREIGN KEY prompt_requests(id) |
| user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| coins | INTEGER | NOT NULL CHECK (> 0) |
| remaining_coins | INTEGER | NOT NULL CHECK (>= 0) |
| run_allocation_status | TEXT | NOT NULL DEFAULT 'reserved_for_future' |
| run_id | INTEGER | nullable |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| refunded_at | TEXT | nullable |

### agent_runs
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| prompt_request_id | INTEGER | NOT NULL, FOREIGN KEY prompt_requests(id) |
| run_number | INTEGER | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'queued' |
| coins_consumed | INTEGER | NOT NULL |
| triggered_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| completed_at | TEXT | nullable |
| reviewed_at | TEXT | nullable |
| artifact_url | TEXT | nullable |
| result_payload | TEXT | nullable |
| summary | TEXT | nullable |
| failure_reason | TEXT | nullable |
| UNIQUE | (prompt_request_id, run_number) |

### run_vote_allocations
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| run_id | INTEGER | NOT NULL, FOREIGN KEY agent_runs(id) |
| vote_id | INTEGER | NOT NULL, FOREIGN KEY prompt_request_votes(id) |
| user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| coins_allocated | INTEGER | NOT NULL CHECK (> 0) |
| refunded_at | TEXT | nullable |
| UNIQUE | (run_id, vote_id) |

### audit_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| actor_user_id | INTEGER | NOT NULL, FOREIGN KEY users(id) |
| repository_id | INTEGER | nullable |
| prompt_request_id | INTEGER | nullable |
| run_id | INTEGER | nullable |
| action | TEXT | NOT NULL |
| details | TEXT | nullable |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP |

### Indexes
- idx_prompt_requests_repository: (repository_id, created_at DESC)
- idx_votes_request: (prompt_request_id, created_at ASC)
- idx_runs_request: (prompt_request_id, run_number DESC)
- idx_audit_log_request: (prompt_request_id, created_at DESC)

## Appendix B: Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| STARTER_COINS | 50 | Coins granted to new users |
| RUN_THRESHOLD_COINS | 10 | Coins needed to trigger an agent run |
| COINS_PER_DOLLAR | 10 | Exchange rate for purchases |
| DATA_DIR | ./data | Local data storage path |
| REPOS_DIR | ./data/repos | Bare repository storage |
| WORK_DIR | ./data/work | Temporary working directory |

### Coin Packs
| ID | Coins | USD |
|----|-------|-----|
| starter-100 | 100 | $10 |
| builder-500 | 500 | $50 |
| shipper-1000 | 1000 | $100 |

## Appendix C: State Machine Diagrams

### Prompt Request Status Flow
```
open -> queued -> in_progress -> awaiting_review -> approved
  ^                                    |
  |                                    v
  +------------- rerun_requested <-----+
                                    |
                                    v
                                 rejected
```

### Agent Run Status Flow
```
queued -> running -> completed -> approved
            |           |
            v           v
          failed   rerun_requested
                        |
                        v
                     rejected
```

## Appendix D: File Structure

```
gitai/
├── data/
│   ├── repos/           # Bare git repositories
│   ├── work/            # Temporary working directories
│   └── gitai.sqlite     # SQLite database
├── src/
│   ├── app.ts           # AppService business logic
│   ├── config.ts        # Configuration constants
│   ├── db.ts            # Database initialization
│   ├── git.ts           # Git operations
│   ├── types.ts         # TypeScript type definitions
│   └── server.ts        # HTTP server (to be implemented)
├── SPEC.md              # This specification
├── package.json
└── tsconfig.json
```

## Appendix E: Error Codes

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| User not found | 404 | User does not exist |
| Wallet not found | 404 | Wallet not initialized |
| Not enough coins | 400 | Insufficient balance for vote |
| Repository not found | 404 | Repository does not exist |
| Prompt Request not found | 404 | Request does not exist |
| Run not found | 404 | Agent run does not exist |
| Maintainer access required | 403 | User is not repository maintainer |
| Prompt Request closed | 400 | Cannot vote on closed/terminal request |
| Run not reviewable | 400 | Run status prevents review action |
| Coin pack not found | 404 | Invalid purchase option |

## Appendix F: Future Roadmap (Post-v1)

### v2 Considerations
- Private repositories
- SSH git transport
- HTTP smart git protocol
- Webhook integrations
- Multiple agents with specializations
- Human-submitted contributions
- CI/CD pipeline integration
- Revenue sharing with maintainers

### v3+ Ideas
- Team/organization support
- Advanced permissions
- Branch protection rules
- Marketplace for agent skills
- Analytics and insights dashboard

(End of file - total 615 lines)

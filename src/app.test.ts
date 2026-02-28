import { describe, it, expect, beforeEach } from "vitest";
import { AppService } from "../src/app.js";
import { getDb, resetDbForTests } from "../src/db.js";

describe("AppService", () => {
  let app: AppService;

  beforeEach(() => {
    resetDbForTests();
    app = new AppService(getDb());
  });

  describe("User signup and starter coins", () => {
    it("grants 50 starter coins on signup", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      expect(user).toBeDefined();

      const wallet = app.getWallet(user!.id);
      expect(wallet?.availableCoins).toBe(50);
      expect(wallet?.lifetimeCoinsGranted).toBe(50);
    });

    it("grants starter coins exactly once", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const wallet = app.getWallet(user!.id);
      expect(wallet?.lifetimeCoinsGranted).toBe(50);
    });

    it("prevents duplicate usernames", () => {
      app.createUser({ username: "alice", email: "alice@example.com" });
      expect(() => {
        app.createUser({ username: "alice", email: "alice2@example.com" });
      }).toThrow();
    });

    it("prevents duplicate emails", () => {
      app.createUser({ username: "alice", email: "alice@example.com" });
      expect(() => {
        app.createUser({ username: "bob", email: "alice@example.com" });
      }).toThrow();
    });
  });

  describe("Wallet purchases", () => {
    it("increases balance correctly on purchase", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      
      app.purchaseCoins(user!.id, "starter-100");
      
      const wallet = app.getWallet(user!.id);
      expect(wallet?.availableCoins).toBe(150); // 50 starter + 100 purchased
      expect(wallet?.lifetimeCoinsPurchased).toBe(100);
    });

    it("rejects invalid coin packs", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      
      expect(() => {
        app.purchaseCoins(user!.id, "invalid-pack");
      }).toThrow("Coin pack not found");
    });
  });

  describe("Voting", () => {
    it("fails on insufficient balance", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // Try to vote 100 coins when only 50 available
      expect(() => {
        app.voteOnPromptRequest(user!.id, pr!.id, { coins: 100 });
      }).toThrow("Not enough coins");
    });

    it("deducts coins immediately on vote", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });

      const wallet = app.getWallet(user!.id);
      expect(wallet?.availableCoins).toBe(40); // 50 - 10
      expect(wallet?.lifetimeCoinsSpent).toBe(10);
    });
  });

  describe("Run creation", () => {
    it("10th committed coin creates exactly one run", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // Vote 10 coins
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });

      const details = app.getPromptRequestDetails(pr!.id);
      expect(details?.runs.length).toBe(1);
      expect(details?.promptRequest.status).toBe("queued");
    });

    it("concurrent-style repeated votes do not create duplicate active runs", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const user2 = app.createUser({ username: "bob", email: "bob@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // First vote triggers run
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
      
      // Additional votes should not create new runs until first completes
      app.voteOnPromptRequest(user2!.id, pr!.id, { coins: 10 });

      const details = app.getPromptRequestDetails(pr!.id);
      expect(details?.runs.length).toBe(1);
    });

    it("rerun requires 10 new coins", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // First run
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
      const details1 = app.getPromptRequestDetails(pr!.id);
      const runId = details1!.runs[0].id;

      // Process and complete the run
      app.processQueuedRunsNow();
      
      // Request rerun
      app.rerunRequest(user!.id, runId);
      
      // Should be open and waiting for 10 new coins
      const details2 = app.getPromptRequestDetails(pr!.id);
      expect(details2?.promptRequest.status).toBe("open");
      expect(details2?.promptRequest.coinsAvailableForNextRun).toBe(0); // All consumed

      // Add 10 more coins to trigger rerun
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
      
      const details3 = app.getPromptRequestDetails(pr!.id);
      expect(details3?.promptRequest.status).toBe("queued");
      expect(details3?.runs.length).toBe(2);
    });
  });

  describe("Review outcomes", () => {
    it("reject refunds only the rejected run tranche", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const user2 = app.createUser({ username: "bob", email: "bob@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // First run (user votes 10)
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
      const details1 = app.getPromptRequestDetails(pr!.id);
      const runId1 = details1!.runs[0].id;

      app.processQueuedRunsNow();
      
      // Request rerun (instead of approve)
      app.rerunRequest(user!.id, runId1);

      // Second run (user2 votes 10)
      app.voteOnPromptRequest(user2!.id, pr!.id, { coins: 10 });
      const details2 = app.getPromptRequestDetails(pr!.id);
      const runId2 = details2!.runs.find((r: any) => r.status === "queued")!.id;

      app.processQueuedRunsNow();

      // Reject second run
      app.rejectRun(user!.id, runId2);

      // user2 should get refund, user should not
      const wallet1 = app.getWallet(user!.id);
      const wallet2 = app.getWallet(user2!.id);

      expect(wallet1?.availableCoins).toBe(40); // 50 - 10 (not refunded)
      expect(wallet2?.availableCoins).toBe(50); // 50 - 10 + 10 (refunded)
    });

    it("approve does not refund", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
      const details = app.getPromptRequestDetails(pr!.id);
      const runId = details!.runs[0].id;

      app.processQueuedRunsNow();
      app.approveRun(user!.id, runId);

      const wallet = app.getWallet(user!.id);
      expect(wallet?.availableCoins).toBe(40); // No refund
      expect(wallet?.lifetimeCoinsSpent).toBe(10);
    });
  });

  describe("Wallet invariants", () => {
    it("wallet never becomes negative", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });
      const pr = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR", 
        body: "Test body content here" 
      });

      // Spend all 50 coins
      app.voteOnPromptRequest(user!.id, pr!.id, { coins: 50 });
      
      const wallet = app.getWallet(user!.id);
      expect(wallet?.availableCoins).toBe(0);

      // Try to spend more
      const pr2 = app.createPromptRequest(user!.id, repo!.id, { 
        title: "Test PR 2", 
        body: "Another test body content here" 
      });

      expect(() => {
        app.voteOnPromptRequest(user!.id, pr2!.id, { coins: 1 });
      }).toThrow("Not enough coins");

      const walletAfter = app.getWallet(user!.id);
      expect(walletAfter?.availableCoins).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Repository creation", () => {
    it("creates repo with initial commit", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      const repo = app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });

      const details = app.getRepositoryDetails(repo!.slug);
      expect(details?.commits.length).toBeGreaterThan(0);
      expect(details?.branches.length).toBeGreaterThan(0);
      expect(details?.headSha).toBeTruthy();
    });

    it("prevents duplicate slugs", () => {
      const user = app.createUser({ username: "alice", email: "alice@example.com" });
      app.createRepository(user!.id, { 
        name: "Test Repo", 
        slug: "test-repo", 
        description: "A test repository for testing" 
      });

      expect(() => {
        app.createRepository(user!.id, { 
          name: "Test Repo 2", 
          slug: "test-repo", 
          description: "Another test repository for testing" 
        });
      }).toThrow();
    });
  });
});

describe("Integration flows", () => {
  let app: AppService;

  beforeEach(() => {
    resetDbForTests();
    app = new AppService(getDb());
  });

  it("full flow: signup, create repo, create PR, vote, process run, approve", () => {
    // 1. Signup
    const user = app.createUser({ username: "alice", email: "alice@example.com" });
    const wallet = app.getWallet(user!.id);
    expect(wallet?.availableCoins).toBe(50);

    // 2. Create repo
    const repo = app.createRepository(user!.id, { 
      name: "Test Repo", 
      slug: "test-repo", 
      description: "A test repository for testing" 
    });
    expect(repo).toBeDefined();

    // 3. Create prompt request
    const pr = app.createPromptRequest(user!.id, repo!.id, { 
      title: "Add feature", 
      body: "Please add a new feature to the repo" 
    });
    expect(pr?.status).toBe("open");

    // 4. Self-fund to 10 coins
    app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
    let details = app.getPromptRequestDetails(pr!.id);
    expect(details?.promptRequest.status).toBe("queued");
    expect(details?.runs.length).toBe(1);

    // 5. Process run
    app.processQueuedRunsNow();
    details = app.getPromptRequestDetails(pr!.id);
    expect(details?.promptRequest.status).toBe("awaiting_review");
    expect(details?.runs[0].status).toBe("completed");

    // 6. Approve
    app.approveRun(user!.id, details!.runs[0].id);
    details = app.getPromptRequestDetails(pr!.id);
    expect(details?.promptRequest.status).toBe("approved");
    expect(details?.runs[0].status).toBe("approved");
  });

  it("full flow: reject with refund", () => {
    // Setup
    const user = app.createUser({ username: "alice", email: "alice@example.com" });
    const voter = app.createUser({ username: "bob", email: "bob@example.com" });
    const repo = app.createRepository(user!.id, { 
      name: "Test Repo", 
      slug: "test-repo", 
      description: "A test repository for testing" 
    });
    const pr = app.createPromptRequest(user!.id, repo!.id, { 
      title: "Add feature", 
      body: "Please add a new feature" 
    });

    // Voter funds
    app.voteOnPromptRequest(voter!.id, pr!.id, { coins: 10 });
    app.processQueuedRunsNow();

    const details = app.getPromptRequestDetails(pr!.id);
    const runId = details!.runs[0].id;

    // Reject
    app.rejectRun(user!.id, runId);

    // Voter gets refund
    const voterWallet = app.getWallet(voter!.id);
    expect(voterWallet?.availableCoins).toBe(50); // Full refund
  });

  it("full flow: rerun request", () => {
    // Setup
    const user = app.createUser({ username: "alice", email: "alice@example.com" });
    const repo = app.createRepository(user!.id, { 
      name: "Test Repo", 
      slug: "test-repo", 
      description: "A test repository for testing" 
    });
    const pr = app.createPromptRequest(user!.id, repo!.id, { 
      title: "Add feature", 
      body: "Please add a new feature" 
    });

    // First run
    app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
    app.processQueuedRunsNow();
    
    let details = app.getPromptRequestDetails(pr!.id);
    const runId = details!.runs[0].id;

    // Request rerun
    app.rerunRequest(user!.id, runId);
    
    details = app.getPromptRequestDetails(pr!.id);
    expect(details?.promptRequest.status).toBe("open");
    expect(details?.runs[0].status).toBe("rerun_requested");

    // Need new coins for rerun
    app.voteOnPromptRequest(user!.id, pr!.id, { coins: 10 });
    details = app.getPromptRequestDetails(pr!.id);
    expect(details?.runs.length).toBe(2);
  });
});

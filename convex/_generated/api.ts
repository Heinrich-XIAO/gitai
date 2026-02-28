// Mock Convex generated API for testing without Convex backend
export const api = {
  gitai: {
    getHomeData: "gitai:getHomeData" as any,
    listRepositories: "gitai:listRepositories" as any,
    getRepositoryBySlug: "gitai:getRepositoryBySlug" as any,
    getRepositoryById: "gitai:getRepositoryById" as any,
    createRepository: "gitai:createRepository" as any,
    getPromptRequestById: "gitai:getPromptRequestById" as any,
    listPromptRequestsByRepository: "gitai:listPromptRequestsByRepository" as any,
    createPromptRequest: "gitai:createPromptRequest" as any,
    getRunsByPromptRequest: "gitai:getRunsByPromptRequest" as any,
    getVotesByPromptRequest: "gitai:getVotesByPromptRequest" as any,
    getAuditLogByPromptRequest: "gitai:getAuditLogByPromptRequest" as any,
    voteOnPromptRequest: "gitai:voteOnPromptRequest" as any,
    approveRun: "gitai:approveRun" as any,
    rejectRun: "gitai:rejectRun" as any,
    rerunRequest: "gitai:rerunRequest" as any,
    createUser: "gitai:createUser" as any,
    getUserById: "gitai:getUserById" as any,
    getWallet: "gitai:getWallet" as any,
    purchaseCoins: "gitai:purchaseCoins" as any,
  },
};

export const internal = {};

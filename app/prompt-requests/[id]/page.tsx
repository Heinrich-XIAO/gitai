"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { FileText, ArrowLeft, Coins, CheckCircle, XCircle, RotateCcw } from "lucide-react";

export default function PromptRequestPage() {
  const params = useParams();
  const id = params.id as string;
  const pr = useQuery(api.gitai.getPromptRequestById, { prId: id });
  const runs = useQuery(
    api.gitai.getRunsByPromptRequest,
    pr ? { promptRequestId: pr._id } : "skip"
  );
  const votes = useQuery(
    api.gitai.getVotesByPromptRequest,
    pr ? { promptRequestId: pr._id } : "skip"
  );
  const audit = useQuery(
    api.gitai.getAuditLogByPromptRequest,
    pr ? { promptRequestId: pr._id } : "skip"
  );
  
  const voteMutation = useMutation(api.gitai.voteOnPromptRequest);
  const approveMutation = useMutation(api.gitai.approveRun);
  const rejectMutation = useMutation(api.gitai.rejectRun);
  const rerunMutation = useMutation(api.gitai.rerunRequest);
  
  const [voteAmount, setVoteAmount] = useState(1);
  const [isVoting, setIsVoting] = useState(false);

  async function handleVote() {
    if (!pr) return;
    setIsVoting(true);
    try {
      await voteMutation({
        userId: "placeholder" as any,
        promptRequestId: pr._id,
        coins: voteAmount,
      });
      setVoteAmount(1);
    } catch (err) {
      console.error(err);
    }
    setIsVoting(false);
  }

  if (!pr) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Prompt Request not found</p>
      </div>
    );
  }

  const canVote = !["approved", "rejected", "closed"].includes(pr.status);
  const isAwaitingReview = pr.status === "awaiting_review";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/prompt-requests">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Prompt Requests
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {pr.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            Created {new Date(pr._creationTime).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          pr.status === "open" ? "bg-blue-100 text-blue-800" :
          pr.status === "queued" ? "bg-yellow-100 text-yellow-800" :
          pr.status === "in_progress" ? "bg-purple-100 text-purple-800" :
          pr.status === "awaiting_review" ? "bg-orange-100 text-orange-800" :
          pr.status === "approved" ? "bg-green-100 text-green-800" :
          "bg-red-100 text-red-800"
        }`}>
          {pr.status.replace("_", " ")}
        </span>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{pr.body}</p>
        </CardContent>
      </Card>

      {/* Funding Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Funding Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total committed</span>
            <span className="font-medium">{pr.totalCoinsCommitted} coins</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available for next run</span>
            <span className="font-medium">{pr.coinsAvailableForNextRun}/10 coins</span>
          </div>
          <Progress value={(pr.coinsAvailableForNextRun / 10) * 100} />
          <p className="text-xs text-muted-foreground">
            Need 10 coins to trigger the next agent run
          </p>
        </CardContent>
      </Card>

      {/* Vote */}
      {canVote && (
        <Card>
          <CardHeader>
            <CardTitle>Vote with Coins</CardTitle>
            <CardDescription>Support this request with coins to prioritize it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-24">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={voteAmount}
                  onChange={(e) => setVoteAmount(parseInt(e.target.value) || 1)}
                />
              </div>
              <Button onClick={handleVote} disabled={isVoting}>
                {isVoting ? "Voting..." : "Vote"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {!runs?.length ? (
            <p className="text-muted-foreground">No runs yet. Add coins to trigger the first run!</p>
          ) : (
            <div className="space-y-4">
              {runs.map((run: any) => (
                <div key={run._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Run #{run.runNumber}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      run.status === "queued" ? "bg-yellow-100 text-yellow-800" :
                      run.status === "running" ? "bg-purple-100 text-purple-800" :
                      run.status === "completed" ? "bg-blue-100 text-blue-800" :
                      run.status === "approved" ? "bg-green-100 text-green-800" :
                      run.status === "rejected" ? "bg-red-100 text-red-800" :
                      run.status === "rerun_requested" ? "bg-gray-100 text-gray-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {run.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Triggered: {new Date(run.triggeredAt).toLocaleString()}
                  </p>
                  {run.completedAt && (
                    <p className="text-sm text-muted-foreground">
                      Completed: {new Date(run.completedAt).toLocaleString()}
                    </p>
                  )}
                  {run.summary && <p className="text-sm">{run.summary}</p>}
                  
                  {run.status === "completed" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600"
                        onClick={() => approveMutation({ actorUserId: "placeholder" as any, runId: run._id })}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => rerunMutation({ actorUserId: "placeholder" as any, runId: run._id })}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Rerun
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600"
                        onClick={() => rejectMutation({ actorUserId: "placeholder" as any, runId: run._id })}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote History */}
      <Card>
        <CardHeader>
          <CardTitle>Vote History</CardTitle>
        </CardHeader>
        <CardContent>
          {!votes?.length ? (
            <p className="text-muted-foreground">No votes yet.</p>
          ) : (
            <div className="space-y-2">
              {votes.map((vote: any) => (
                <div key={vote._id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">User {vote.userId.slice(0, 8)}...</span>
                  <div className="flex gap-4 text-sm">
                    <span>{vote.coins} coins</span>
                    <span className="text-muted-foreground">{vote.remainingCoins} remaining</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      vote.runAllocationStatus === "consumed_by_run" ? "bg-green-100 text-green-800" :
                      vote.runAllocationStatus === "refunded" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {vote.runAllocationStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {!audit?.length ? (
            <p className="text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {audit.map((entry: any) => (
                <div key={entry._id} className="text-sm py-1 border-b last:border-0">
                  <span className="font-medium">{entry.action.replace(/\./g, " ")}</span>
                  {entry.details && <span className="text-muted-foreground"> • {entry.details}</span>}
                  <span className="text-muted-foreground float-right">
                    {new Date(entry._creationTime).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

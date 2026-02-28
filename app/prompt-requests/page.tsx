"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";

export default function PromptRequestsPage() {
  const homeData = useQuery(api.gitai.getHomeData);
  const promptRequests = homeData?.topPromptRequests || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <FileText className="h-8 w-8" />
        Prompt Requests
      </h1>

      {!promptRequests.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No prompt requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {promptRequests.map((pr: any) => (
            <Link key={pr._id} href={`/prompt-requests/${pr._id}`}>
              <Card className="hover:bg-accent/50 transition-colors h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{pr.title}</CardTitle>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to next run</span>
                    <span className="font-medium">{pr.coinsAvailableForNextRun}/10 coins</span>
                  </div>
                  <Progress value={(pr.coinsAvailableForNextRun / 10) * 100} />
                  <p className="text-sm text-muted-foreground">
                    Total committed: {pr.totalCoinsCommitted} coins
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

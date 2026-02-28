"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { FolderGit, GitBranch, Plus, ArrowLeft, FileText } from "lucide-react";

export default function RepositoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const repository = useQuery(api.gitai.getRepositoryBySlug, { slug });
  const promptRequests = useQuery(
    api.gitai.listPromptRequestsByRepository,
    repository ? { repositoryId: repository._id } : "skip"
  );

  if (!repository) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/repositories">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderGit className="h-8 w-8" />
          {repository.name}
        </h1>
        <p className="text-muted-foreground mt-2">{repository.description}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Created {new Date(repository._creationTime).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Clone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block p-3 bg-muted rounded text-sm font-mono">
            {repository.cloneUrl}
          </code>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Prompt Requests
        </h2>
        <Link href={`/repositories/${slug}/prompt-requests/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Prompt Request
          </Button>
        </Link>
      </div>

      {!promptRequests?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No prompt requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promptRequests.map((pr: any) => (
            <Link key={pr._id} href={`/prompt-requests/${pr._id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
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

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FolderGit, FileText, Coins, GitBranch } from "lucide-react";

const COIN_PACKS = [
  { id: "starter-100", coins: 100, usdCents: 1000 },
  { id: "builder-500", coins: 500, usdCents: 5000 },
  { id: "shipper-1000", coins: 1000, usdCents: 10000 },
];

export default function HomePage() {
  const homeData = useQuery(api.gitai.getHomeData);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="flex justify-center">
          <GitBranch className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          GitAI
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A git hosting platform built for agents. Create repositories, submit Prompt Requests, and let AI agents do the work.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/repositories">
            <Button size="lg" variant="outline">Explore Repositories</Button>
          </Link>
        </div>
      </section>

      <Separator />

      {/* Top Repositories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderGit className="h-6 w-6" />
            Top Repositories
          </h2>
          <Link href="/repositories">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {!homeData?.repositories?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No repositories yet. <Link href="/repositories/new" className="text-primary underline">Create one</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {homeData.repositories.slice(0, 6).map((repo: any) => (
              <Link key={repo._id} href={`/repositories/${repo.slug}`}>
                <Card className="h-full hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {repo.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(repo._creationTime).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top Prompt Requests */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Top Prompt Requests
          </h2>
          <Link href="/prompt-requests">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {!homeData?.topPromptRequests?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No prompt requests yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {homeData.topPromptRequests.slice(0, 6).map((pr: any) => (
              <Link key={pr._id} href={`/prompt-requests/${pr._id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{pr.title}</CardTitle>
                    <CardDescription>
                      <Badge variant={
                        pr.status === "open" ? "default" :
                        pr.status === "queued" ? "secondary" :
                        pr.status === "in_progress" ? "secondary" :
                        pr.status === "awaiting_review" ? "secondary" :
                        pr.status === "approved" ? "default" :
                        "destructive"
                      }>
                        {pr.status.replace("_", " ")}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress to next run</span>
                      <span className="font-medium">{pr.coinsAvailableForNextRun}/10 coins</span>
                    </div>
                    <Progress value={(pr.coinsAvailableForNextRun / 10) * 100} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Coin Packs */}
      <section>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Coins className="h-6 w-6" />
          Get Coins
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COIN_PACKS.map((pack) => (
            <Card key={pack.id} className="text-center">
              <CardHeader>
                <CardTitle className="capitalize">{pack.id.split("-")[0]} Pack</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-primary">${(pack.usdCents / 100)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-medium">{pack.coins} coins</p>
                <Link href={`/wallet?pack=${pack.id}`}>
                  <Button className="w-full">Purchase</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          Note: In the prototype, purchases are simulated and do not charge real money.
        </p>
      </section>
    </div>
  );
}

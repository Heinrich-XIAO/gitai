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
import { FolderGit, Plus } from "lucide-react";

export default function RepositoriesPage() {
  const repositories = useQuery(api.gitai.listRepositories);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderGit className="h-8 w-8" />
          Repositories
        </h1>
        <Link href="/repositories/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Repository
          </Button>
        </Link>
      </div>

      {!repositories?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderGit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No repositories yet.</p>
            <Link href="/repositories/new">
              <Button>Create the first repository</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo: any) => (
            <Link key={repo._id} href={`/repositories/${repo.slug}`}>
              <Card className="h-full hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle>{repo.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {repo.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(repo._creationTime).toLocaleDateString()}
                  </p>
                  <code className="mt-2 block text-xs bg-muted p-2 rounded">
                    {repo.cloneUrl}
                  </code>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

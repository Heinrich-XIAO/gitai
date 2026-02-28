"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
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
import { FolderGit, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewRepositoryPage() {
  const router = useRouter();
  const createRepo = useMutation(api.gitai.createRepository);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;

    try {
      // In a real app, we'd get the current user's ID from auth
      // For now, we'll use a placeholder that will fail gracefully
      const bareRepoPath = `/tmp/repos/${slug}.git`;
      const cloneUrl = `file://${bareRepoPath}`;

      await createRepo({
        name,
        slug,
        description,
        maintainerUserId: "placeholder" as any, // Replace with actual auth
        bareRepoPath,
        cloneUrl,
      });

      router.push(`/repositories/${slug}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/repositories">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderGit className="h-6 w-6" />
            <CardTitle>Create Repository</CardTitle>
          </div>
          <CardDescription>
            Create a new git repository to host your code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm bg-destructive/10 text-destructive rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Repository Name</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="My Awesome Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                minLength={2}
                maxLength={40}
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                placeholder="my-awesome-project"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly name: lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={280}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="A brief description of your repository..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create Repository"}
              </Button>
              <Link href="/repositories">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPromptRequestPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const repository = useQuery(api.gitai.getRepositoryBySlug, { slug });
  const createPR = useMutation(api.gitai.createPromptRequest);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!repository) return;

    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;

    try {
      // In a real app, we'd get the current user's ID from auth
      const prId = await createPR({
        repositoryId: repository._id,
        authorUserId: "placeholder" as any, // Replace with actual auth
        title,
        body,
      });

      router.push(`/prompt-requests/${prId}`);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  if (!repository) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/repositories/${slug}`}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Repository
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <CardTitle>New Prompt Request</CardTitle>
          </div>
          <CardDescription>
            Create a prompt request for <strong>{repository.name}</strong>
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                minLength={4}
                maxLength={120}
                placeholder="Add a new feature..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                name="body"
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                placeholder="Describe what you want the agent to do in detail..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create Prompt Request"}
              </Button>
              <Link href={`/repositories/${slug}`}>
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

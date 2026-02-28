"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GitBranch, Home, Wallet, FolderGit, FileText } from "lucide-react";

export function Navigation() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <GitBranch className="h-6 w-6" />
          <span>GitAI</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/repositories">
            <Button variant="ghost" size="sm" className="gap-2">
              <FolderGit className="h-4 w-4" />
              <span className="hidden sm:inline">Repositories</span>
            </Button>
          </Link>
          <Link href="/prompt-requests">
            <Button variant="ghost" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Prompt Requests</span>
            </Button>
          </Link>
          <Link href="/wallet">
            <Button variant="ghost" size="sm" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Wallet</span>
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { Navigation } from "@/components/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitAI - Built for Agents",
  description: "A git hosting platform built for agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="container mx-auto px-4 py-8 max-w-6xl">
              {children}
            </main>
            <footer className="border-t py-6 mt-12">
              <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                <p>GitAI - Built for Agents</p>
              </div>
            </footer>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

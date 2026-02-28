"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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
import { Wallet, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";

const COIN_PACKS = [
  { id: "starter-100", name: "Starter", coins: 100, usdCents: 1000 },
  { id: "builder-500", name: "Builder", coins: 500, usdCents: 5000 },
  { id: "shipper-1000", name: "Shipper", coins: 1000, usdCents: 10000 },
];

// Mock wallet data - replace with actual user data from auth
const mockWallet = {
  availableCoins: 50,
  lifetimeCoinsPurchased: 0,
  lifetimeCoinsGranted: 50,
  lifetimeCoinsSpent: 0,
};

const mockTransactions = [
  { id: 1, type: "signup_grant", coinsDelta: 50, createdAt: new Date().toISOString() },
];

export default function WalletPage() {
  const purchaseMutation = useMutation(api.gitai.purchaseCoins);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  async function handlePurchase(pack: typeof COIN_PACKS[0]) {
    setIsPurchasing(pack.id);
    try {
      await purchaseMutation({
        userId: "placeholder" as any,
        packId: pack.id,
        coins: pack.coins,
        usdCents: pack.usdCents,
      });
    } catch (err) {
      console.error(err);
    }
    setIsPurchasing(null);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Wallet className="h-8 w-8" />
        My Wallet
      </h1>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-5xl font-bold text-primary">
            {mockWallet.availableCoins}
            <span className="text-2xl text-muted-foreground ml-2">coins</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Lifetime purchased</p>
              <p className="font-medium">{mockWallet.lifetimeCoinsPurchased}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lifetime granted</p>
              <p className="font-medium">{mockWallet.lifetimeCoinsGranted}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lifetime spent</p>
              <p className="font-medium">{mockWallet.lifetimeCoinsSpent}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Coins */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Coins</CardTitle>
          <CardDescription>
            Buy coins to support prompt requests and trigger agent runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {COIN_PACKS.map((pack) => (
              <Card key={pack.id} className="text-center">
                <CardHeader>
                  <CardTitle>{pack.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-primary">
                      ${(pack.usdCents / 100)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-medium">{pack.coins} coins</p>
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchase(pack)}
                    disabled={isPurchasing === pack.id}
                  >
                    {isPurchasing === pack.id ? "Processing..." : "Purchase"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Note: In the prototype, purchases are simulated and do not charge real money.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!mockTransactions.length ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {mockTransactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {tx.coinsDelta > 0 ? (
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{tx.type.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.coinsDelta > 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.coinsDelta > 0 ? "+" : ""}{tx.coinsDelta} coins
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

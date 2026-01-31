"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BetaForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message ?? "Something went wrong.";
        toast.error(msg);
        return;
      }
      toast.success("You're on the list. We'll be in touch.");
      setEmail("");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="px-4 py-16 sm:py-20" id="join-beta">
      <div className="mx-auto max-w-md">
        <Card className="border-border/80 bg-card/50">
          <CardHeader>
            <CardTitle>Join the beta</CardTitle>
            <CardDescription>
              Get early access and product updates. No spam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="beta-email">Email</Label>
                <Input
                  id="beta-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  aria-describedby="beta-email-hint"
                />
                <p id="beta-email-hint" className="sr-only">
                  We only use this to notify you about the beta.
                </p>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting…" : "Notify me"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

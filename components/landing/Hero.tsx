"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Turn news into X 🧵 threads that earn attention.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Paste a link. Hilox extracts the article and generates a clean,
          spaced thread (hook → context → key points → CTA) in seconds—plus
          copy buttons. No signup.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="min-w-[160px]">
            <Link href="/app">Try it free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[160px]">
            <a href="#join-beta">Join beta</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

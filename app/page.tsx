import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Screens } from "@/components/landing/Screens";
import { BetaForm } from "@/components/landing/BetaForm";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/80 bg-card/30 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            🧵 Hilox
          </span>
          <nav className="flex items-center gap-3" aria-label="Main navigation">
            <Button asChild variant="ghost" size="sm">
              <a href="#join-beta">Join beta</a>
            </Button>
            <Button asChild size="sm">
              <Link href="/app">Try it free</Link>
            </Button>
            <a
              href="mailto:feedback@hilox.app?subject=Hilox%20Feedback"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Feedback
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <Features />
        <Screens />
        <BetaForm />
      </main>

      <Footer />
    </div>
  );
}

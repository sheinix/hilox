import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/30 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hilox. News-to-Thread.
        </p>
        <nav className="flex items-center gap-6" aria-label="Footer links">
          <Link
            href="/app"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Try it free
          </Link>
          <a
            href="mailto:feedback@hilox.app?subject=Hilox%20Feedback"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Feedback
          </a>
          <a
            href="https://x.com/sheinix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            X
          </a>
        </nav>
      </div>
    </footer>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { UrlInputCard } from "@/components/url-input-card";
import { SettingsBar } from "@/components/settings-bar";
import { ThreadOutput } from "@/components/thread-output";
import { HistoryPanel } from "@/components/history-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getHistory,
  pushHistory,
  clearHistory,
  type HistoryItem,
} from "@/lib/storage";
import type { Tone, Length, ThreadLanguage } from "@/components/settings-bar";
import { Loader2, ArrowLeft } from "lucide-react";

type GenerateState = "idle" | "loading" | "success" | "error";

interface GenerationResult {
  tweets: string[];
  meta: {
    title: string;
    siteName: string;
    url?: string;
    tone: string;
    length: string;
    createdAt: string;
  };
  sources: { title: string; url?: string; siteName: string };
}

const INITIAL_HISTORY: HistoryItem[] = [];

export default function AppPage() {
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("8");
  const [angle, setAngle] = useState("");
  const [threadLanguage, setThreadLanguage] =
    useState<ThreadLanguage>("English");
  const [includeOriginalLink, setIncludeOriginalLink] = useState(false);
  const [state, setState] = useState<GenerateState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );

  const loadHistory = useCallback(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleGenerate = useCallback(async () => {
    const hasUrl = url.trim().length > 0;
    const hasPaste = pastedText.trim().length > 0;
    if (!hasUrl && !hasPaste) {
      toast.error("Enter a URL or paste article text.");
      return;
    }

    if (!hasUrl && includeOriginalLink) {
      setIncludeOriginalLink(false);
    }

    setState("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: hasUrl ? url.trim() : undefined,
          pastedText: hasPaste ? pastedText.trim() : undefined,
          tone,
          length,
          angle: angle.trim() || undefined,
          threadLanguage:
            threadLanguage !== "English" ? threadLanguage : undefined,
          includeOriginalLink: hasUrl && includeOriginalLink ? true : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message ?? "Generation failed.";
        setErrorMessage(msg);
        setState("error");
        toast.error(msg);
        return;
      }

      setResult({
        tweets: data.tweets,
        meta: data.meta,
        sources: data.sources,
      });
      setState("success");

      pushHistory({
        meta: data.meta,
        tweets: data.tweets,
        sources: data.sources,
        createdAt: data.meta.createdAt,
      });
      setHistory(getHistory());
      toast.success("Thread generated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error.";
      setErrorMessage(msg);
      setState("error");
      toast.error(msg);
    }
  }, [url, pastedText, tone, length, angle, threadLanguage, includeOriginalLink]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy")
    );
  }, []);

  const handleCopyPost = useCallback(
    (_index: number, text: string) => copyToClipboard(text, "Post"),
    [copyToClipboard]
  );
  const handleCopyAllNumbered = useCallback(
    (text: string) => copyToClipboard(text, "Thread (numbered)"),
    [copyToClipboard]
  );
  const handleCopyAllBlock = useCallback(
    (text: string) => copyToClipboard(text, "Thread (block)"),
    [copyToClipboard]
  );

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setResult({
      tweets: item.tweets,
      meta: item.meta,
      sources: item.sources,
    });
    setSelectedHistoryId(item.id);
    setState("success");
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
    setSelectedHistoryId(null);
    toast.success("History cleared.");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                🧵 Hilox: News-to-Thread
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste a URL or text → get a ready-to-post X thread.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <UrlInputCard
              url={url}
              pastedText={pastedText}
              onUrlChange={setUrl}
              onPastedTextChange={setPastedText}
              disabled={state === "loading"}
            />
            <SettingsBar
              tone={tone}
              length={length}
              angle={angle}
              threadLanguage={threadLanguage}
              includeOriginalLink={includeOriginalLink}
              hasUrl={url.trim().length > 0}
              onToneChange={setTone}
              onLengthChange={setLength}
              onAngleChange={setAngle}
              onThreadLanguageChange={setThreadLanguage}
              onIncludeOriginalLinkChange={setIncludeOriginalLink}
              disabled={state === "loading"}
            />
            <Card>
              <CardContent className="pt-6">
                <Button
                  className="w-full gap-2"
                  onClick={handleGenerate}
                  disabled={state === "loading"}
                >
                  {state === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    "Generate Thread!"
                  )}
                </Button>
                {errorMessage && state === "error" && (
                  <p className="mt-3 text-sm text-destructive">
                    {errorMessage}
                  </p>
                )}
              </CardContent>
            </Card>
            <HistoryPanel
              items={history}
              onSelect={handleHistorySelect}
              onClear={history.length > 0 ? handleClearHistory : undefined}
              selectedId={selectedHistoryId}
            />
          </div>

          <div className="space-y-6">
            <ThreadOutput
              tweets={result?.tweets ?? []}
              meta={
                result?.meta
                  ? { title: result.meta.title, siteName: result.meta.siteName }
                  : undefined
              }
              onCopyPost={handleCopyPost}
              onCopyAllNumbered={handleCopyAllNumbered}
              onCopyAllBlock={handleCopyAllBlock}
            />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t bg-card/30">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Hilox. News-to-Thread.
            </p>
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <a
              href="https://x.com/sheinix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              X: x.com/sheinix
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

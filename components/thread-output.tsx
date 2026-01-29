"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, ListOrdered, FileText } from "lucide-react";
import { tweetCharCount } from "@/lib/thread";
import { cn } from "@/lib/utils";

const MAX_CHARS = 280;

export interface ThreadOutputProps {
  tweets: string[];
  meta?: { title?: string; siteName?: string };
  onCopyTweet?: (index: number, text: string) => void;
  onCopyAllNumbered?: (text: string) => void;
  onCopyAllBlock?: (text: string) => void;
  className?: string;
}

export function ThreadOutput({
  tweets,
  meta,
  onCopyTweet,
  onCopyAllNumbered,
  onCopyAllBlock,
  className,
}: ThreadOutputProps) {
  if (tweets.length === 0) {
    return (
      <Card className={cn("min-h-[200px]", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Generated thread will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  const numbered = tweets.map((t, i) => `${i + 1}. ${t}`).join("\n\n");
  const block = tweets.join("\n\n");

  return (
    <TooltipProvider>
      <Card className={cn(className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Thread</CardTitle>
          {meta?.title && (
            <Badge variant="secondary" className="font-normal">
              {meta.siteName ? `${meta.siteName}: ` : ""}
              {meta.title.slice(0, 40)}
              {meta.title.length > 40 ? "…" : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopyAllNumbered?.(numbered)}
                  className="gap-1.5"
                >
                  <ListOrdered className="h-4 w-4" />
                  Copy all (numbered)
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy thread as numbered list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopyAllBlock?.(block)}
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  Copy all (block)
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy thread with blank lines between tweets</TooltipContent>
            </Tooltip>
          </div>
          <ul className="space-y-3">
            {tweets.map((tweet, i) => {
              const len = tweetCharCount(tweet);
              const over = len > MAX_CHARS;
              return (
                <li
                  key={i}
                  className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-muted-foreground">#{i + 1}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-mono",
                          over ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {len}/280
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onCopyTweet?.(i, tweet)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy this tweet</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{tweet}</p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

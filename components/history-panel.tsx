"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryItem } from "@/lib/storage";
import { cn } from "@/lib/utils";

export interface HistoryPanelProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear?: () => void;
  selectedId?: string | null;
  className?: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function HistoryPanel({
  items,
  onSelect,
  onClear,
  selectedId,
  className,
}: HistoryPanelProps) {
  if (items.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Last 10 generations appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">History</CardTitle>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-3">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full rounded-lg border p-2 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedId === item.id
                      ? "border-primary bg-accent"
                      : "border-transparent bg-muted/30"
                  )}
                >
                  <span className="line-clamp-1 font-medium">
                    {item.meta.title || "Untitled"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatDate(item.createdAt)} · {item.tweets.length} tweets
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

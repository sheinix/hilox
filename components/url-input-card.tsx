"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

const LABEL_URL = "Article URL";
const LABEL_PASTE = "Paste article text (fallback)";
const PLACEHOLDER_URL = "https://example.com/article";
const PLACEHOLDER_PASTE = "Paste the full article text here if the URL didn't work…";

export interface UrlInputCardProps {
  url: string;
  pastedText: string;
  onUrlChange: (value: string) => void;
  onPastedTextChange: (value: string) => void;
  disabled?: boolean;
}

export function UrlInputCard({
  url,
  pastedText,
  onUrlChange,
  onPastedTextChange,
  disabled,
}: UrlInputCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Source</CardTitle>
        <CardDescription>Enter a news or article URL, or paste the text if extraction fails.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="paste">Paste text</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="space-y-2">
            <Label htmlFor="url-input" className="sr-only">
              {LABEL_URL}
            </Label>
            <Input
              id="url-input"
              type="url"
              placeholder={PLACEHOLDER_URL}
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              disabled={disabled}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="paste" className="space-y-2">
            <Label htmlFor="paste-input" className="sr-only">
              {LABEL_PASTE}
            </Label>
            <Textarea
              id="paste-input"
              placeholder={PLACEHOLDER_PASTE}
              value={pastedText}
              onChange={(e) => onPastedTextChange(e.target.value)}
              disabled={disabled}
              rows={6}
              className="resize-y font-mono text-sm"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

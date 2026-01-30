"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TONE_OPTIONS, LENGTH_OPTIONS, THREAD_LANGUAGE_OPTIONS } from "@/lib/validators";
import { cn } from "@/lib/utils";

export type Tone = (typeof TONE_OPTIONS)[number];
export type Length = (typeof LENGTH_OPTIONS)[number];
export type ThreadLanguage = (typeof THREAD_LANGUAGE_OPTIONS)[number];

export interface SettingsBarProps {
  tone: Tone;
  length: Length;
  angle: string;
  threadLanguage: ThreadLanguage;
  includeOriginalLink: boolean;
  hasUrl: boolean;
  onToneChange: (tone: Tone) => void;
  onLengthChange: (length: Length) => void;
  onAngleChange: (angle: string) => void;
  onThreadLanguageChange: (lang: ThreadLanguage) => void;
  onIncludeOriginalLinkChange: (include: boolean) => void;
  disabled?: boolean;
}

export function SettingsBar({
  tone,
  length,
  angle,
  threadLanguage,
  includeOriginalLink,
  hasUrl,
  onToneChange,
  onLengthChange,
  onAngleChange,
  onThreadLanguageChange,
  onIncludeOriginalLinkChange,
  disabled,
}: SettingsBarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Tone</Label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => onToneChange(t)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  tone === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Thread length (posts)</Label>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onLengthChange(n)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  length === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Thread language</Label>
          <select
            value={threadLanguage}
            onChange={(e) => onThreadLanguageChange(e.target.value as ThreadLanguage)}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {THREAD_LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="angle">Angle (optional)</Label>
          <Input
            id="angle"
            placeholder="e.g. focus on implications for developers"
            value={angle}
            onChange={(e) => onAngleChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-link"
            checked={includeOriginalLink}
            onCheckedChange={(checked) => onIncludeOriginalLinkChange(checked === true)}
            disabled={disabled || !hasUrl}
          />
          <Label
            htmlFor="include-link"
            className={cn(
              "text-sm font-normal cursor-pointer",
              (!hasUrl || disabled) && "opacity-50 cursor-not-allowed"
            )}
          >
            Include original link
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

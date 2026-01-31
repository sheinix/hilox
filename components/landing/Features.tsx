import { Card, CardContent } from "@/components/ui/card";
import { Sliders, ListOrdered, Copy } from "lucide-react";

const features = [
  {
    title: "Tone controls",
    description:
      "Professional, casual, urgent, or neutral — match the voice to your audience.",
    icon: Sliders,
  },
  {
    title: "Thread length + style presets",
    description:
      "Choose 6–10+ tweets and optional angle. One click to generate.",
    icon: ListOrdered,
  },
  {
    title: "Copy buttons",
    description:
      "Copy a single tweet, copy all (numbered), or copy all (blank-line separated).",
    icon: Copy,
  },
];

export function Features() {
  return (
    <section className="px-4 py-16 sm:py-20" id="features">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Built for speed and control
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Three things that make posting threads painless.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-border/80 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

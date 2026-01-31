import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Hilox — News to X Thread in 20 Seconds",
  description:
    "Paste a news URL → get a ready-to-post X thread. Extraction, hook, and copy-per-tweet. No signup.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

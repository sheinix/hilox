import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "🧵 Hilox: News-to-Thread",
  description: "Easily turn news articles into trendy, readable X Threads. Paste a news or article URL (or text), get a tweet thread with hook + CTA.",
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

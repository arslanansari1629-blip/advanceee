import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BotForge Cloud — host unlimited Telegram bots 24/7, free forever",
  description:
    "Paste your Python Telegram bot, BotForge detects every import, installs the requirements and keeps it online 24/7 with live logs, restarts and crash supervision.",
  openGraph: {
    title: "BotForge Cloud",
    description: "Paste Python. We install the requirements. Your bot stays online 24/7.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="app-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}

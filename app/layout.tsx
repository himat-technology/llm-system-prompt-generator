import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "LLM System Prompt Generator & Optimizer";
const description =
  "Design, structure, validate, and test production-grade AI system prompts with browser-local privacy.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: title,
  keywords: [
    "system prompt generator",
    "prompt engineering",
    "LLM",
    "XML prompt",
    "Claude",
    "GPT",
    "prompt variables",
    "AI guardrails",
  ],
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

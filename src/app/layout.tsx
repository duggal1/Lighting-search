import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

export const viewport: Viewport = {
  themeColor: "#3B82F6", // blue-400
  colorScheme: "light",
  initialScale: 1,
  width: "device-width",
};

export const metadata: Metadata = {
  title: {
    template: "Thunder Search AI | %s",
    default: "Thunder Search AI | Powerful Semantic Search Engine",
  },
  description:
    "Thunder Search AI is an advanced semantic search engine designed to deliver powerful, accurate, and fast search results, revolutionizing the way we retrieve information.",
 
  metadataBase: new URL("https://thundersearch.ai/"),
  openGraph: {
    title: "Thunder Search AI | Powerful Semantic Search Engine",
    siteName: "Thunder Search AI",
    description:
      "Thunder Search AI is an advanced semantic search engine designed to deliver powerful, accurate, and fast search results, revolutionizing the way we retrieve information.",
    url: "https://thundersearch.ai/",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    title: "Thunder Search AI | Powerful Semantic Search Engine",
    creator: "@thundersearchai",
    site: "@thundersearchai",
    description:
      "Thunder Search AI is an advanced semantic search engine designed to deliver powerful, accurate, and fast search results, revolutionizing the way we retrieve information.",
    card: "summary_large_image",
  },
  alternates: {
    canonical: "https://thundersearch.ai/",
  },
};
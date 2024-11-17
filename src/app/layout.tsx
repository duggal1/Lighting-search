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
    template: "Stargate | %s",
    default: "Stargate | NextJS SaaS Landing",
  },
  description:
    "Stargate is a modern SaaS Landing Page template built with NextJS. It's designed to provide a seamless and engaging experience for showcasing software products, especially those in the tech and startup niches.",
 
  metadataBase: new URL("https://stargate.nfteam.eu/"),
  openGraph: {
    title: "Stargate | NextJS SaaS Landing",
    siteName: "Stargate | NextJS SaaS Landing", 
    description:
      "Stargate is a modern SaaS Landing Page template built with NextJS. It's designed to provide a seamless and engaging experience for showcasing software products, especially those in the tech and startup niches.",
    url: "https://stargate.nfteam.eu/",
    type: "website",
    locale: "hu_HU",
  },
  twitter: {
    title: "Stargate | NextJS SaaS Landing",
    creator: "@nfteam_eu",
    site: "@nfteam_eu",
    description:
      "Stargate is a modern SaaS Landing Page template built with NextJS. It's designed to provide a seamless and engaging experience for showcasing software products, especially those in the tech and startup niches.",
    card: "summary_large_image",
  },
  alternates: {
    canonical: "https://stargate.nfteam.eu/",
  },
};

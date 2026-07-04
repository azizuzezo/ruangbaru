import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { person } from "@/lib/content/profile";
import { AuroraBackground } from "@/components/chrome/aurora-background";
import { CursorFollower } from "@/components/chrome/cursor-follower";
import { PageLoader } from "@/components/chrome/page-loader";
import { ServiceWorkerRegistrar } from "@/components/chrome/service-worker-registrar";
import { SmoothScrollProvider } from "@/components/chrome/smooth-scroll-provider";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const siteUrl = "https://abdazizs-portfolio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${person.name} | ${person.headline}`,
  description: siteDescription(),
  keywords: [
    "Abdul Aziz Setiawan",
    "Customer Service",
    "Customer Experience",
    "Guest Service",
    "Fintech Support",
    "Hospitality",
    "Skor Technologies",
  ],
  authors: [{ name: person.name }],
  openGraph: {
    title: person.name,
    description: siteDescription(),
    url: siteUrl,
    siteName: person.name,
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: person.name,
    description: siteDescription(),
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
};

function siteDescription() {
  return "Customer Experience professional across transportation, hospitality, and fintech — from Jakarta's Commuter Line to Skor Technologies.";
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: person.name,
  jobTitle: person.headline,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jakarta",
    addressCountry: "ID",
  },
  email: person.email,
  sameAs: [person.linkedin],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="min-h-screen bg-void font-sans text-fog antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PageLoader />
        <AuroraBackground />
        <CursorFollower />
        <ServiceWorkerRegistrar />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}

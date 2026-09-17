import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative } from "next/font/google";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import CustomCursor from "@/components/site/CustomCursor";
import BackToTop from "@/components/site/BackToTop"; // <-- Import the BackToTop component
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-display",
  weight: ["700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Forevercraft — Free WoW Forever Talent Calculator & Guides",
    template: "%s | Forevercraft",
  },
  description:
    "A free, fan-made planner and guide hub for World of Warcraft: Forever.",
  openGraph: {
    images: [{ url: "/images/og/opengraph.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzelDecorative.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CustomCursor />
        <SiteHeader />
        {children}
        <SiteFooter />
        <BackToTop /> {/* <-- Mount the BackToTop component globally here */}
      </body>
    </html>
  );
}
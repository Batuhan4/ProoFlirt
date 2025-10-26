import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "ProoFlirt – Private Dating, Verified Humans",
  description:
    "Log in securely without sharing personal data. We use ZK proofs to verify you are real without revealing identity.",
  manifest: "/assets/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/favicon.ico", rel: "icon" },
      { url: "/assets/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/assets/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/assets/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/assets/favicon.ico"],
    apple: [
      {
        url: "/assets/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full bg-transparent">
      <body
        className={`${inter.variable} ${sora.variable} font-sans text-[var(--color-text-primary)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

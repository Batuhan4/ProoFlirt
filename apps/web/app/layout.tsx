import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Prooflirt – Private Dating, Verified Humans",
  description:
    "Log in securely without sharing personal data. We use ZK proofs to verify you are real without revealing identity.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-neutral-900">
      <body className={`${inter.variable} font-sans text-white`}>{children}</body>
    </html>
  );
}

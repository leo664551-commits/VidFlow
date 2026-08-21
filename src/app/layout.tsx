import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VidFlow - TikTok-Style Short Video Platform",
  description: "VidFlow is a modern, cloud-native short video sharing web platform. Watch, like, comment, and share trending videos.",
  keywords: ["VidFlow", "Short Videos", "TikTok", "Reels", "Entertainment", "Video Sharing"],
  authors: [{ name: "VidFlow Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "VidFlow - Short Video Platform",
    description: "Discover trending short videos and follow your favorite creators on VidFlow.",
    siteName: "VidFlow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VidFlow - Short Video Platform",
    description: "Discover trending short videos and follow your favorite creators on VidFlow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white dark`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

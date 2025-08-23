import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FastShare",
  description: "A fast, and easy-to-use file temporary file sharing service",
  openGraph: {
    title: "FastShare",
    description: "A fast, and easy-to-use file temporary file sharing service",
    url: "https://share.jay2404.me",
    siteName: "FastShare",
    images: [
      {
        url: "https://share.jay2404.me/favicon.ico",
        width: 1200,
        height: 630,
        alt: "FastShare - Share files quickly and easily",
      },
    ],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased `}>
        {children}
        <Toaster
          position="bottom-right"
          duration={3000}
          expand={false}
          toastOptions={{
            className: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            duration: 3000,
            style: {
              fontFamily: "var(--font-geist-sans)",
            },
          }}
        />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || ""} />
        <Footer />
      </body>
    </html>
  );
}

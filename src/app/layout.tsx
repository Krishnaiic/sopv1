import type { Metadata } from "next";
import { Suspense } from "react";
import { Manrope, Geist_Mono } from "next/font/google";
import { NavigationLoadingOverlay } from "@/components/navigation-loading-overlay";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SOP Management System",
  description: "Standard Operating Procedures Management and Approval System",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <NavigationLoadingOverlay />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

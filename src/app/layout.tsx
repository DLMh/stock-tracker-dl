import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockTracker – Suivi de stock",
  description: "Suivi des flux et quantités de stock en temps réel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 pb-20 md:pb-0">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}

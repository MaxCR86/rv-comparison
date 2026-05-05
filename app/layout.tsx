import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RV Comparison",
  description: "Compare RV trailers from Facebook Marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

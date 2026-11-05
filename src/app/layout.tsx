import type { Metadata } from "next";
import { Inter, Josefin_Sans } from "next/font/google";
import "./globals.css";

// Same type pairing as the live axerealty.lk (approved 2026-11-04).
const josefin = Josefin_Sans({ variable: "--font-heading", subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Axe Realty OS",
  description: "Axe Realty internal platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${josefin.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

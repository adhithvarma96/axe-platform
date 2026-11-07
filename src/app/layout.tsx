import { Inter, Josefin_Sans } from "next/font/google";

// Same type pairing as the live axerealty.lk (approved 2026-11-04). Shared by the
// public website and the internal app; each loads its own stylesheet.
const josefin = Josefin_Sans({ variable: "--font-heading", subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${josefin.variable} ${inter.variable}`}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

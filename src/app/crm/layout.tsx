import type { Metadata } from "next";
import "../globals.css";

// Internal app (app.axerealty.lk): its own styles, never indexed.
export const metadata: Metadata = {
  title: "Axe Realty OS",
  description: "Axe Realty internal platform",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}

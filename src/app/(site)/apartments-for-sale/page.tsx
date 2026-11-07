import { Suspense } from "react";
import type { Metadata } from "next";
import { sitePage } from "@/lib/site/data";
import { IntentPage } from "../intent-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await sitePage("/apartments-for-sale/");
  return {
    title: { absolute: `${page?.title ?? "Apartments for Sale in Colombo"} - Axe Realty` },
    description: page?.meta_description ?? undefined,
    alternates: { canonical: "/apartments-for-sale/" },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 60 }}>Loading…</div>}>
      <IntentPage intent="sale" />
    </Suspense>
  );
}

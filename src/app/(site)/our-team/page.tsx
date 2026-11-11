import { Suspense } from "react";
import type { Metadata } from "next";
import { team } from "@/lib/site/data";
import { SITE } from "@/lib/site/listing";
import { Banner, Crumbs, CtaBand } from "../place";
import { SiteHeader } from "../components";
import { TeamCards } from "../sections";

export const metadata: Metadata = {
  title: { absolute: "Our Team - Axe Realty" },
  description: "Meet the Axe Realty team: Colombo apartment specialists for buying, renting and listing. Contact each advisor directly on WhatsApp.",
  alternates: { canonical: "/our-team/" },
};

export default function Page() {
  return (
    <Suspense fallback={<><SiteHeader /><div style={{ minHeight: 600 }} /></>}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const people = await team();
  return (
    <>
      <SiteHeader />
      <Banner eyebrow="Our Team" h1="Meet the Axe Realty team" />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Our Team" }]} />
      <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <p className="lead">
          A small, focused team that knows Colombo&apos;s apartment buildings inside out. Message any of us directly; you&apos;ll deal with the same person from the first viewing to handover.
        </p>
        {people.length ? <TeamCards people={people} /> : (
          <p>Our team profiles are on their way. In the meantime, WhatsApp us on <a href={`https://wa.me/${SITE.whatsapp}`}>{SITE.phone}</a>.</p>
        )}
      </section>
      <CtaBand title="Not sure who to speak to?" text="Send us a message and we'll put you in touch with the right advisor for your building or area." />
    </>
  );
}

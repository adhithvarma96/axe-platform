import type { Metadata } from "next";
import { SITE } from "@/lib/site/listing";
import { ContactForm } from "../forms";
import { Banner, Crumbs, SiteHeader } from "../place";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to Axe Realty, Colombo's apartment specialists. WhatsApp, call or email us, or visit us on Horton Place, Colombo 07.",
  alternates: { canonical: "/contact-us/" },
};

export default function ContactPage() {
  const cards = [
    ["Locate Us", `${SITE.address}, Sri Lanka`],
    ["Call or WhatsApp", SITE.phone],
    ["Write to Us", SITE.email],
  ];
  return (
    <>
      <SiteHeader />
      <Banner eyebrow="Get in touch" h1="Contact Axe Realty" />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Contact Us" }]} />
      <section className="wrap section" style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {cards.map(([t, v]) => (
            <div key={t} style={{ background: "var(--section)", borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>{t}</h2>
              <p style={{ color: "var(--ink)", fontWeight: 500 }}>{v}</p>
            </div>
          ))}
          <a className="s-btn s-btn-wa" href={`https://wa.me/${SITE.whatsapp}`}>WhatsApp us now</a>
        </div>
        <div style={{ flex: "2 1 460px", minWidth: 0, background: "var(--section)", borderRadius: 16, padding: 28, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ fontSize: 26 }}>Send us a message</h2>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

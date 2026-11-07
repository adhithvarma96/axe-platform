import { Suspense } from "react";
import { StaticPage, staticMetadata } from "../static-page";

export const generateMetadata = () => staticMetadata("/about-us/", "About Us");

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: 600 }} />}>
      <StaticPage path="/about-us/" eyebrow="About Axe Realty" h1="About Axe Realty" />
    </Suspense>
  );
}

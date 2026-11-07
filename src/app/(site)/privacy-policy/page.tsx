import { Suspense } from "react";
import { StaticPage, staticMetadata } from "../static-page";

export const generateMetadata = () => staticMetadata("/privacy-policy/", "Privacy Policy");

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: 600 }} />}>
      <StaticPage path="/privacy-policy/" eyebrow="Privacy" h1="Privacy Policy" />
    </Suspense>
  );
}

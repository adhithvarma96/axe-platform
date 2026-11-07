import { redirect } from "next/navigation";

// The dashboard arrives in Phase 2; until then the app opens on Properties.
export default function Home() {
  redirect("/properties");
}

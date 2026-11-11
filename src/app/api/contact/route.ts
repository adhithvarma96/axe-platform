// Website Call / Email / WhatsApp buttons: see src/lib/contact-tap.ts.
import { handleTap, type Channel } from "@/lib/contact-tap";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleTap(request, (url.searchParams.get("c") ?? "whatsapp") as Channel);
}

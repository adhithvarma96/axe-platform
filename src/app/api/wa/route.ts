// Older WhatsApp-button address, kept so links already shared keep working: same as /api/contact?c=whatsapp.
import { handleTap } from "@/lib/contact-tap";

export async function GET(request: Request) {
  return handleTap(request, "whatsapp");
}

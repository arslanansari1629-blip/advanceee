import { json } from "@/lib/api";
import { TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({ templates: TEMPLATES });
}

import { analyzeSource, parseRequirements } from "@/lib/pyreqs";
import { bad, json, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Static analysis of pasted Python: import -> PyPI resolution, framework and
 * version pinning, token detection, sandbox warnings. Instant, no deps needed.
 */
export async function POST(req: Request) {
  const body = await readJson<{ source?: string; files?: { path: string; content: string }[] }>(req);
  if (!body?.source) return bad("No source provided");
  if (body.source.length > 400_000) return bad("Source too large (400 KB limit)");

  const analysis = analyzeSource(body.source, body.files ?? []);
  return json({
    ...analysis,
    parsedRequirements: parseRequirements(analysis.requirements),
  });
}

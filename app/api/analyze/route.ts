import { analyzeSource, parseRequirements } from "@/lib/pyreqs";
import { compileBehaviour } from "@/lib/behavior";
import { bad, json, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Static analysis of pasted Python: import -> PyPI resolution, framework and
 * version pinning, token detection + a dry-run compile of the handlers into the
 * webhook engine's behaviour spec (so the user sees exactly what will be sent).
 */
export async function POST(req: Request) {
  const body = await readJson<{
    source?: string;
    files?: { path: string; content: string }[];
    compile?: boolean;
  }>(req);
  if (!body?.source) return bad("No source provided");
  if (body.source.length > 400_000) return bad("Source too large (400 KB limit)");

  const analysis = analyzeSource(body.source, body.files ?? []);
  const behaviour = body.compile === false ? null : compileBehaviour(body.source);

  return json({
    ...analysis,
    behaviour,
    parsedRequirements: parseRequirements(analysis.requirements),
  });
}

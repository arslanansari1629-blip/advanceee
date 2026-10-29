import { bots, logs } from "@/lib/data";

export const dynamic = "force-dynamic";

const templates: { level: string; event: string; make: (i: number) => string }[] = [
  { level: "info", event: "update", make: (i) => `update "/start" from @demo${i % 9} · chat ${740000000 + i}` },
  { level: "success", event: "reply", make: (i) => `reply → "Hey! I am live 24/7." (${38 + (i % 60)} ms)` },
  { level: "success", event: "auth", make: (i) => `getMe → ok (${90 + (i % 80)} ms)` },
  { level: "warn", event: "webhook", make: (i) => `cold start resolved in ${500 + (i % 700)} ms` },
  { level: "debug", event: "webhook", make: () => "delivery signed · secret token verified" },
];

/**
 * Server-Sent Events stream of simulated engine log lines.
 * `curl -N /api/admin/logs/stream` to watch it live.
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let counter = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      send("hello", {
        engine: "botforge-webhook-v3",
        replay: logs.slice(-5).map((l) => ({ ts: l.ts, level: l.level, message: l.message })),
      });

      timer = setInterval(() => {
        counter += 1;
        const t = templates[counter % templates.length];
        const bot = bots[counter % bots.length];
        send("log", {
          id: `evt_${counter}`,
          ts: new Date().toISOString(),
          level: t.level,
          event: t.event,
          bot: bot.slug,
          chat: String(740000000 + counter),
          latency: t.level === "success" ? 38 + (counter % 60) : null,
          message: t.make(counter),
        });
        if (counter >= 240) {
          if (timer) clearInterval(timer);
          send("done", { reason: "demo_window_exhausted", events: counter });
          controller.close();
        }
      }, 1200);

      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

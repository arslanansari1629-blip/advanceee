import Link from "next/link";
import { Bot, Search } from "lucide-react";
import { Card } from "@/components/ui";

export default function BotNotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised text-faint">
        <Bot size={20} />
      </div>
      <h1 className="text-[16px] font-semibold text-ink">No bot with that id exists on the product</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
        The console looks the id up in the live <span className="font-mono text-[11.5px]">/api/admin/data</span> payload.
        If the bot was deleted on the product, its record is gone here too.
      </p>
      <Link href="/admin/bots" className="btn-primary mt-4 h-8 text-[12px]">
        <Search size={13} /> Browse all bots
      </Link>
    </Card>
  );
}

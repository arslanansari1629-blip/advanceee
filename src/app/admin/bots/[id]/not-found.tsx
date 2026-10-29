import Link from "next/link";
import { BotOff } from "lucide-react";

export default function BotNotFound() {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-raised text-faint">
        <BotOff size={18} />
      </span>
      <h1 className="mt-1 text-[15px] font-semibold text-ink">That bot does not exist</h1>
      <p className="max-w-sm text-[12px] text-faint">
        It may have been deleted, or the id belongs to a different workspace. Everything still lives in the audit log for 30
        days.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Link href="/admin/bots" className="btn-primary h-8 text-[11.5px]">
          Back to fleet
        </Link>
        <Link href="/admin/audit" className="btn h-8 text-[11.5px]">
          Open audit log
        </Link>
      </div>
    </div>
  );
}

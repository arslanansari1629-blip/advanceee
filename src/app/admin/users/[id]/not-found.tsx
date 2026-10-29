import Link from "next/link";
import { Search, UserX } from "lucide-react";
import { Card } from "@/components/ui";

export default function UserNotFound() {
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised text-faint">
        <UserX size={20} />
      </div>
      <h1 className="text-[16px] font-semibold text-ink">No account with that id exists on the product</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
        Accounts are looked up in the live <span className="font-mono text-[11.5px]">/api/admin/data</span> payload, so a
        deleted account leaves no trace here.
      </p>
      <Link href="/admin/users" className="btn-primary mt-4 h-8 text-[12px]">
        <Search size={13} /> Browse accounts
      </Link>
    </Card>
  );
}

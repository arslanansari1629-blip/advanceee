import { IconActivity, IconBolt } from "./icons";

/**
 * Platform-wide notices set from the operator console.
 * Rendered server-side so they appear on first paint.
 */
export default function NoticeBar({
  maintenance,
  maintenanceMessage,
  broadcast,
}: {
  maintenance: boolean;
  maintenanceMessage: string;
  broadcast: string;
}) {
  if (!maintenance && !broadcast) return null;
  return (
    <div className="space-y-1.5">
      {maintenance && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-2 text-[12px] text-amber-100">
          <IconActivity size={14} className="mt-0.5 shrink-0" />
          <p>
            <strong>Maintenance in progress.</strong>{" "}
            {maintenanceMessage || "Some features may be briefly unavailable while we ship an update."}
          </p>
        </div>
      )}
      {broadcast && (
        <div className="flex items-start gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-3.5 py-2 text-[12px] text-cyan-100">
          <IconBolt size={14} className="mt-0.5 shrink-0" />
          <p>{broadcast}</p>
        </div>
      )}
    </div>
  );
}

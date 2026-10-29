import Link from "next/link";
import type { ReactNode } from "react";
import { cn, initials } from "@/lib/format";
import type { ProductBotStatus } from "@/lib/types";

/* ---------------------------------------------------------------- chips */

const statusStyles: Record<ProductBotStatus, { label: string; cls: string; dot: string }> = {
  live: { label: "Live", cls: "text-[#34e0a1] bg-[#34e0a1]/10 border-[#34e0a1]/25", dot: "#34e0a1" },
  paused: { label: "Paused", cls: "text-[#f5b544] bg-[#f5b544]/10 border-[#f5b544]/25", dot: "#f5b544" },
  error: { label: "Error", cls: "text-[#ff7c88] bg-[#ff5d6c]/10 border-[#ff5d6c]/25", dot: "#ff5d6c" },
  draft: { label: "Draft", cls: "text-[#94a0b8] bg-white/[0.04] border-line", dot: "#7c879e" },
  deploying: { label: "Deploying", cls: "text-[#8b7cff] bg-[#8b7cff]/10 border-[#8b7cff]/25", dot: "#8b7cff" },
};

export function StatusBadge({ status, pulse = false }: { status: ProductBotStatus; pulse?: boolean }) {
  const s = statusStyles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        s.cls,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", pulse && status === "live" && "live-dot")}
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}

const planStyles: Record<string, string> = {
  free: "border-line bg-white/[0.04] text-muted",
  pro: "border-[#8b7cff]/30 bg-[#8b7cff]/10 text-[#b3a8ff]",
  scale: "border-[#34e0a1]/30 bg-[#34e0a1]/10 text-[#6ff0bf]",
  founder: "border-[#f5b544]/30 bg-[#f5b544]/10 text-[#f7c66b]",
  suspended: "border-[#ff5d6c]/30 bg-[#ff5d6c]/10 text-[#ff929c]",
};

/** Plan is a free-form string on the product, so unknown values fall back gracefully. */
export function PlanBadge({ plan }: { plan: string }) {
  const key = (plan || "free").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        planStyles[key] ?? "border-line bg-white/[0.04] text-muted",
      )}
    >
      {key === "scale" || key === "founder" ? "◆ " : ""}
      {plan || "free"}
    </span>
  );
}

const tones = {
  neutral: "border-line bg-white/[0.04] text-muted",
  success: "border-[#34e0a1]/25 bg-[#34e0a1]/10 text-[#5eeac0]",
  warn: "border-[#f5b544]/25 bg-[#f5b544]/10 text-[#f7c66b]",
  danger: "border-[#ff5d6c]/25 bg-[#ff5d6c]/10 text-[#ff929c]",
  info: "border-[#4cc9f0]/25 bg-[#4cc9f0]/10 text-[#7edcf7]",
  accent: "border-[#8b7cff]/25 bg-[#8b7cff]/10 text-[#b3a8ff]",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color = "#34e0a1", pulse = false }: { color?: string; pulse?: boolean }) {
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", pulse && "live-dot")}
      style={{ background: color }}
    />
  );
}

export function Avatar({
  name,
  color = "#8b7cff",
  size = 28,
  ring = false,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        ring && "ring-2 ring-panel",
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color,
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* --------------------------------------------------------------- layout */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function CardHead({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4", className)}>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[11.5px] text-faint">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            <span className="h-1 w-1 rounded-full bg-brand" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon ? <div className="mb-1 text-faint">{icon}</div> : null}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {body ? <p className="max-w-sm text-[12px] text-faint">{body}</p> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line/80", className)} />;
}

export function Progress({
  value,
  color = "rgb(var(--brand))",
  height = 6,
  track = "rgb(var(--line))",
}: {
  value: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: track }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

export function Sparkline({
  data,
  color = "rgb(var(--brand))",
  width = 92,
  height = 28,
  fill = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - 2 - ((d - min) / range) * (height - 4);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `sp-${width}-${height}-${data.length}-${Math.round(data[data.length - 1] ?? 0)}-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
        </>
      ) : null}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Metric({
  label,
  value,
  delta,
  hint,
  spark,
  color = "rgb(var(--brand))",
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  spark?: number[];
  color?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="panel group relative overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{label}</span>
        {icon ? <span className="text-faint transition-colors group-hover:text-muted">{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</span>
        {spark ? <Sparkline data={spark} color={color} width={78} height={26} /> : null}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px]">
        {delta ? (
          <span className={cn("font-medium", delta.positive === false ? "text-[#ff8a94]" : "text-[#4fdfb0]")}>
            {delta.positive === false ? "↓" : "↑"} {delta.value}
          </span>
        ) : null}
        {hint ? <span className="truncate text-faint">{hint}</span> : null}
      </div>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("btn", className)}>
      {children}
    </Link>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[11.5px] tracking-tight text-muted", className)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

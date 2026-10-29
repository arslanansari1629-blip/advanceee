"use client";

import { useMemo, useRef, useState } from "react";
import { cn, fmt } from "@/lib/format";

export type Series = { name: string; color: string; data: number[] };

const VB_W = 820;

function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function AreaChart({
  series,
  labels,
  height = 240,
  format,
  formatKind = "compact",
  yTicks = 4,
  legend = true,
  className,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  format?: (n: number) => string;
  formatKind?: "compact" | "money" | "number";
  yTicks?: number;
  legend?: boolean;
  className?: string;
}) {
  const fmtValue = useMemo(() => {
    if (format) return format;
    if (formatKind === "money") return (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`);
    if (formatKind === "number") return (n: number) => n.toLocaleString("en-US");
    return (n: number) => fmt(n);
  }, [format, formatKind]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { max, points, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    const rawMax = Math.max(...all, 1);
    const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2;
    const maxV = Math.ceil(rawMax / step) * step;
    const p = series.map((s) => ({
      ...s,
      pts: s.data.map((v, i) => {
        const x = (i / Math.max(1, s.data.length - 1)) * VB_W;
        const y = height - 18 - (v / maxV) * (height - 36);
        return [x, y] as [number, number];
      }),
    }));
    return {
      max: maxV,
      points: p,
      ticks: Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxV / yTicks) * i)),
    };
  }, [series, height, yTicks]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (labels.length - 1)));
  };

  return (
    <div className={cn("relative", className)}>
      {legend ? (
        <div className="mb-2 flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
      <div
        ref={wrapRef}
        className="relative"
        style={{ height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-11 flex-col justify-between pb-5 pt-1 text-[9.5px] text-faint">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{fmtValue(t)}</span>
          ))}
        </div>
        <div className="absolute inset-y-0 left-10 right-0">
          <svg
            viewBox={`0 0 ${VB_W} ${height}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.name} id={`area-${i}-${s.color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={series.length > 1 ? 0.16 : 0.26} />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t, i) => {
              const y = height - 18 - (t / max) * (height - 36);
              return (
                <line
                  key={i}
                  x1="0"
                  x2={VB_W}
                  y1={y}
                  y2={y}
                  stroke="rgb(var(--line))"
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? undefined : "3 6"}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.7}
                />
              );
            })}
            {points.map((s, si) => {
              const path = smoothPath(s.pts);
              return (
                <g key={s.name}>
                  <path
                    d={`${path} L${VB_W},${height - 18} L0,${height - 18} Z`}
                    fill={`url(#area-${si}-${s.color.replace(/[^a-z0-9]/gi, "")})`}
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
            {hover !== null ? (
              <g>
                <line
                  x1={(hover / Math.max(1, labels.length - 1)) * VB_W}
                  x2={(hover / Math.max(1, labels.length - 1)) * VB_W}
                  y1="0"
                  y2={height - 18}
                  stroke="rgb(var(--faint))"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
                {points.map((s) => {
                  const p = s.pts[hover];
                  if (!p) return null;
                  return (
                    <circle
                      key={s.name}
                      cx={p[0]}
                      cy={p[1]}
                      r="3.5"
                      fill="rgb(var(--panel))"
                      stroke={s.color}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            ) : null}
          </svg>
        </div>
        {hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-20 min-w-[132px] rounded-lg border border-line bg-panel/95 p-2 text-[11px] shadow-pop backdrop-blur"
            style={{
              left: `calc(40px + ${(hover / Math.max(1, labels.length - 1)) * 100}% * 0.9)`,
              transform:
                hover / Math.max(1, labels.length - 1) < 0.14
                  ? "translateX(0)"
                  : hover / Math.max(1, labels.length - 1) > 0.86
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-faint">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-3 py-0.5">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-mono text-[11px] text-ink">{fmtValue(s.data[hover] ?? 0)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between pl-10 text-[9.5px] text-faint">
        {labels
          .filter((_, i) => i % Math.ceil(labels.length / 7) === 0)
          .map((l, i) => (
            <span key={`${l}-${i}`}>{l}</span>
          ))}
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

export function Bars({
  data,
  height = 160,
  color = "rgb(var(--brand))",
  format,
  formatKind = "compact",
  highlight,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  formatKind?: "compact" | "money" | "number";
  highlight?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmtValue =
    format ??
    (formatKind === "money"
      ? (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`)
      : formatKind === "number"
        ? (n: number) => n.toLocaleString("en-US")
        : (n: number) => fmt(n));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="relative flex-1">
            <div
              className="absolute bottom-0 w-full rounded-t-[3px] transition-all duration-300 group-hover:brightness-125"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background:
                  highlight === i
                    ? `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 30%, transparent))`
                    : `linear-gradient(180deg, color-mix(in oklab, ${color} 55%, transparent), color-mix(in oklab, ${color} 12%, transparent))`,
              }}
            />
            <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-panel px-2 py-1 text-[10px] text-ink shadow-pop group-hover:block">
              {fmtValue(d.value)}
            </div>
          </div>
          <span className="mt-1.5 truncate text-center text-[9.5px] text-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  data,
  size = 132,
  thickness = 13,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={thickness} />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-semibold leading-none text-ink">{centerValue}</span>
        <span className="mt-1 text-[9.5px] uppercase tracking-wide text-faint">{centerLabel}</span>
      </div>
    </div>
  );
}

export function Heatmap({
  values,
  color = "52, 224, 161",
  cell = 9,
  gap = 3,
  columns = 45,
}: {
  values: number[];
  color?: string;
  cell?: number;
  gap?: number;
  columns?: number;
}) {
  const [tip, setTip] = useState<{ i: number; x: number } | null>(null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div className="relative">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }}
        onMouseLeave={() => setTip(null)}
      >
        {values.map((v, i) => {
          const op = 0.14 + ((v - min) / range) * 0.86;
          return (
            <div
              key={i}
              onMouseEnter={() => setTip({ i, x: i })}
              className="rounded-[2px] transition-transform hover:scale-125"
              style={{
                height: cell,
                background: `rgba(${color}, ${op})`,
              }}
            />
          );
        })}
      </div>
      {tip ? (
        <div className="pointer-events-none absolute -top-6 left-0 z-10 rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] text-ink shadow-pop">
          day {tip.i + 1} · {(values[tip.i] * 100).toFixed(2)}%
        </div>
      ) : null}
    </div>
  );
}

export function Gauge({
  value,
  max = 100,
  size = 118,
  label,
  color = "rgb(var(--brand))",
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = size / 2 - 10;
  const circ = Math.PI * r;
  return (
    <div className="relative flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M10,${size / 2} A${r},${r} 0 0 1 ${size - 10},${size / 2}`}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M10,${size / 2} A${r},${r} 0 0 1 ${size - 10},${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
        />
      </svg>
      <div className="-mt-5 text-center">
        <div className="text-[17px] font-semibold leading-none text-ink">{value.toFixed(1)}%</div>
        {label ? <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-faint">{label}</div> : null}
      </div>
    </div>
  );
}

export function Sparkbars({ data, color = "rgb(var(--brand))", height = 30 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d, i) => (
        <span
          key={i}
          className="flex-1 rounded-[1px]"
          style={{ height: `${Math.max(8, (d / max) * 100)}%`, background: color, opacity: 0.35 + (d / max) * 0.65 }}
        />
      ))}
    </div>
  );
}

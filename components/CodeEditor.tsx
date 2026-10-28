"use client";

import { useRef } from "react";
import { cx } from "./ui";

export default function CodeEditor({
  value,
  onChange,
  height = 460,
  placeholder,
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;

  return (
    <div className="code-wrap" style={{ height }}>
      <div ref={gutterRef} className="code-gutter" style={{ minWidth: 46, height }}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        className={cx("code-input scroll-thin")}
        style={{ height }}
        spellCheck={false}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        onKeyDown={(e) => {
          if (readOnly) return;
          if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = value.slice(0, start) + "    " + value.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 4;
            });
          }
        }}
      />
    </div>
  );
}

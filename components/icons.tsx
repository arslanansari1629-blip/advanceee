import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconBolt = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" /></svg>
);
export const IconRobot = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V4M9 14h.01M15 14h.01M9 17.5h6" />
    <circle cx="12" cy="3" r="1.4" />
  </svg>
);
export const IconGrid = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconTerminal = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="2.5" y="4" width="19" height="16" rx="2.5" /><path d="m7 9 3 3-3 3M13 15h4" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M7 4.5 19 12 7 19.5v-15Z" fill="currentColor" stroke="none" /></svg>
);
export const IconStop = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></svg>
);
export const IconRestart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
);
export const IconSettings = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" /></svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m4 12.5 5 5L20 6.5" /></svg>
);
export const IconWarn = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 9v5M12 17h.01" /></svg>
);
export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="m9 6 6 6-6 6" /></svg>
);
export const IconDownload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3v12m0 0 4.5-4.5M12 15 7.5 10.5M4 20h16" /></svg>
);
export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconCopy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);
export const IconSpark = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const IconCloud = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6.5 19a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 17.7 10.2 3.9 3.9 0 0 1 17.5 19h-11Z" /></svg>
);
export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconFile = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
);
export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M9 5v14M15 5v14" /></svg>
);
export const IconActivity = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
);
export const IconShield = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3 20 6v6c0 5-3.5 7.7-8 9-4.5-1.3-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconGithub = ({ size, ...p }: P) => (
  <svg width={size ?? 16} height={size ?? 16} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.2.66.8.55A11.5 11.5 0 0 0 23.5 12A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);
export const IconGlobe = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>
);
export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  ChevronsUpDown,
  CircleCheck,
  CircleHelp,
  Command,
  Database,
  Globe,
  LogOut,
  Menu,
  Moon,
  PanelsTopLeft,
  RefreshCw,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/format";
import { Avatar } from "./ui";

export type ShellAlert = { title: string; detail: string; href: string; tone: string };

export type ShellData = {
  host: string;
  storage: string;
  bots: number;
  live: number;
  errors: number;
  users: number;
  updates: number;
  maintenance: boolean;
  signupsOpen: boolean;
  connected: boolean;
  /** What the last product read returned — drives honest status wording. */
  status: "ok" | "unlinked" | "unauthorized" | "unreachable";
  alerts: ShellAlert[];
};

type NavItem = { href: string; label: string; icon: React.ElementType; hint: string; badge?: string };

const navItems: { title: string; items: NavItem[] }[] = [
  {
    title: "Product",
    items: [
      { href: "/admin", label: "Overview", icon: Activity, hint: "Live totals from the product" },
      { href: "/admin/bots", label: "Bots", icon: Bot, hint: "Every deployed bot" },
      { href: "/admin/users", label: "Accounts", icon: Users, hint: "Registered users and plans" },
    ],
  },
  {
    title: "Control",
    items: [
      { href: "/admin/settings", label: "Platform", icon: Settings, hint: "Maintenance, broadcast, signups" },
      { href: "/admin/system", label: "System", icon: Database, hint: "Connection, storage, diagnostics" },
    ],
  },
];

export function AppShell({
  children,
  admin,
  shell,
}: {
  children: React.ReactNode;
  admin?: { user: string; name: string; via: "product" | "local" };
  shell: ShellData;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menu, setMenu] = useState<"none" | "bell" | "user" | "product">("none");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [clock, setClock] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = (localStorage.getItem("bf-theme") as "dark" | "light") || "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenu("none");
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setMenu("none");
      }
      if (e.key === "/" && !paletteOpen) {
        const target = e.target as HTMLElement;
        if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const allNav = navItems.flatMap((section) => section.items);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNav.filter((n) => !q || n.label.toLowerCase().includes(q) || n.hint.toLowerCase().includes(q));
  }, [query, allNav]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("bf-theme", next);
  };

  const toggleSidebar = () => {
    const collapsed = document.documentElement.getAttribute("data-sidebar") === "collapsed";
    const next = collapsed ? "expanded" : "collapsed";
    document.documentElement.setAttribute("data-sidebar", next);
    localStorage.setItem("bf-sidebar", next);
  };

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((p, i) => ({
      label: p === "admin" ? "Admin" : p.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      href: "/" + parts.slice(0, i + 1).join("/"),
    }));
  }, [pathname]);

  const onPaletteKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === "Enter" && results[cursor]) {
      router.push(results[cursor].href);
      setPaletteOpen(false);
    }
  };

  const livePct = shell.bots > 0 ? Math.round((shell.live / shell.bots) * 100) : 0;
  const me = admin ?? { user: "operator", name: "Operator", via: "local" as const };

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line/80 bg-panel" data-open={mobileOpen}>
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <Link href="/admin" className="group flex items-center gap-2.5 overflow-hidden">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#34e0a1] to-[#0e9f74] text-[#04140f] shadow-glow">
              <Zap size={16} strokeWidth={2.6} />
            </span>
            <span className="sidebar-label min-w-0">
              <span className="block truncate text-[13.5px] font-semibold leading-tight text-ink">BotForge</span>
              <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-faint">admin cloud</span>
            </span>
          </Link>
          <button
            className="sidebar-extra rounded-md p-1.5 text-faint hover:bg-raised hover:text-ink lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative px-2.5">
          <button
            onClick={() => setMenu(menu === "product" ? "none" : "product")}
            className="nav-item flex w-full items-center gap-2 rounded-lg border border-line/70 bg-raised/50 px-2 py-1.5 text-left transition-colors hover:border-faint/50"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand">
              <Globe size={11} />
            </span>
            <span className="sidebar-label min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium text-ink">{shell.host}</span>
              <span className="flex items-center gap-1 text-[9.5px] text-faint">
                <span className={cn("h-1 w-1 rounded-full", shell.connected ? "bg-brand" : "bg-[#ff5d6c]")} />
                {shell.connected ? `${shell.storage} storage` : "not connected"}
              </span>
            </span>
            <ChevronsUpDown size={12} className="sidebar-label shrink-0 text-faint" />
          </button>
          {menu === "product" ? (
            <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-panel shadow-pop">
              <div className="border-b border-line/70 px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-faint">Connected product</p>
                <p className="truncate text-[11.5px] text-ink">{shell.host}</p>
              </div>
              <a
                href={`https://${shell.host}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
              >
                <ArrowUpRight size={11} /> Open public site
              </a>
              <a
                href={`https://${shell.host}/console`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
              >
                <ArrowUpRight size={11} /> Open product console
              </a>
              <Link
                href="/admin/system"
                className="flex items-center gap-2 border-t border-line/70 px-2.5 py-2 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
              >
                <Database size={11} /> Connection diagnostics
              </Link>
            </div>
          ) : null}
        </div>

        <nav className="mt-3 flex-1 overflow-y-auto px-2.5 pb-3">
          {navItems.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="sidebar-label mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-faint/80">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const badge =
                    item.href === "/admin/bots" && shell.bots > 0
                      ? String(shell.bots)
                      : item.href === "/admin/users" && shell.users > 0
                        ? String(shell.users)
                        : undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "nav-item group relative flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[12.5px] transition-colors",
                        active ? "bg-brand/10 text-ink" : "text-muted hover:bg-raised/70 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand" />
                      ) : null}
                      <Icon size={15} strokeWidth={2} className={cn("shrink-0", active ? "text-brand" : "text-faint group-hover:text-muted")} />
                      <span className="sidebar-label flex-1 truncate font-medium">{item.label}</span>
                      {badge ? (
                        <span
                          className={cn(
                            "sidebar-label rounded-full px-1.5 py-px text-[9.5px] font-semibold",
                            active ? "bg-brand/20 text-brand" : "bg-raised text-faint",
                          )}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-extra mx-2.5 mb-2 rounded-lg border border-line/70 bg-gradient-to-br from-[#8b7cff]/10 to-transparent p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-faint">
            <Activity size={11} className="text-[#b3a8ff]" /> Live coverage
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-[15px] font-semibold text-ink">
              {shell.live}
              <span className="text-[11px] font-normal text-faint"> / {shell.bots}</span>
            </span>
            <span className="text-[10px] text-faint">{livePct}% live</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-[#8b7cff]" style={{ width: `${livePct}%` }} />
          </div>
          <div className="mt-2 text-[10px] leading-relaxed text-faint">
            {!shell.connected ? (
              <span className="flex items-center gap-1 text-[#ff929c]">
                <TriangleAlert size={9} /> no live data · {shell.status}
              </span>
            ) : shell.maintenance ? (
              <span className="flex items-center gap-1 text-[#f7c66b]">
                <TriangleAlert size={9} /> maintenance mode on
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#4fdfb0]">
                <CircleCheck size={9} /> serving users normally
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-line/70 p-2">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className="hidden rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink lg:block"
              aria-label="Collapse sidebar"
            >
              <PanelsTopLeft size={14} />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              className="rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink"
              aria-label="Keyboard shortcuts"
              onClick={() => setPaletteOpen(true)}
            >
              <CircleHelp size={14} />
            </button>
            <div className="relative ml-auto">
              <button
                onClick={() => setMenu(menu === "user" ? "none" : "user")}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-raised"
              >
                <Avatar name={me.name} color="#34e0a1" size={26} />
                <span className="sidebar-label text-left">
                  <span className="block max-w-[86px] truncate text-[11.5px] font-medium leading-tight text-ink">{me.name}</span>
                  <span className="block text-[9.5px] leading-tight text-faint">operator</span>
                </span>
              </button>
              {menu === "user" ? (
                <div className="absolute bottom-full left-0 z-50 mb-1 w-60 overflow-hidden rounded-lg border border-line bg-panel shadow-pop">
                  <div className="border-b border-line/80 px-3 py-2">
                    <p className="text-[12px] font-medium text-ink">{me.name}</p>
                    <p className="text-[10.5px] text-faint">
                      {me.user} ·{" "}
                      {me.via === "product" ? "product operator session" : "local fallback session"}
                    </p>
                  </div>
                  <Link href="/admin/system" className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted hover:bg-raised hover:text-ink">
                    <Database size={13} /> Session & connection
                  </Link>
                  <form action="/api/auth/logout" method="post">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 border-t border-line/80 px-3 py-2 text-[12px] text-[#ff8a94] hover:bg-[#ff5d6c]/10"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="main-shell flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <button
              className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={17} />
            </button>

            <div className="hidden items-center gap-1.5 text-[12px] text-faint md:flex">
              {crumbs.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="text-line">/</span> : null}
                  <Link href={c.href} className={cn("transition-colors hover:text-ink", i === crumbs.length - 1 && "text-muted")}>
                    {c.label}
                  </Link>
                </span>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="group hidden items-center gap-2 rounded-lg border border-line bg-raised/40 px-2.5 py-1.5 text-[12px] text-faint transition-colors hover:border-faint/50 hover:text-muted sm:flex"
              >
                <Search size={13} />
                <span className="w-28 text-left">Go to…</span>
                <span className="flex items-center gap-0.5 rounded border border-line bg-canvas px-1 py-px text-[9.5px]">
                  <Command size={8} /> K
                </span>
              </button>

              <div
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[10.5px] font-medium lg:flex",
                  shell.connected
                    ? "border-[#34e0a1]/25 bg-[#34e0a1]/[0.07] text-[#5eeac0]"
                    : "border-[#ff5d6c]/25 bg-[#ff5d6c]/[0.07] text-[#ff929c]",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", shell.connected ? "bg-[#34e0a1] live-dot" : "bg-[#ff5d6c]")} />
                {shell.connected
                  ? `product reachable · ${shell.storage}`
                  : shell.status === "unlinked"
                    ? "session not linked to product"
                    : shell.status === "unauthorized"
                      ? "product rejected the session"
                      : "product unreachable"}
              </div>

              <div className="hidden items-center gap-1.5 font-mono text-[10.5px] text-faint xl:flex">
                <span className="h-1 w-1 rounded-full bg-faint" /> {clock} UTC
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenu(menu === "bell" ? "none" : "bell")}
                  className="relative rounded-lg border border-line bg-raised/40 p-1.5 text-muted transition-colors hover:text-ink"
                  aria-label="Alerts"
                >
                  <Bell size={14} />
                  {shell.alerts.length > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5d6c] text-[8px] font-bold text-white">
                      {shell.alerts.length}
                    </span>
                  ) : null}
                </button>
                {menu === "bell" ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-line bg-panel shadow-pop">
                    <div className="flex items-center justify-between border-b border-line/80 px-3 py-2">
                      <span className="text-[12px] font-medium text-ink">Alerts</span>
                      <span className="text-[10px] text-faint">{shell.alerts.length} from live data</span>
                    </div>
                    {shell.alerts.length === 0 ? (
                      <p className="px-3 py-6 text-center text-[11px] text-faint">
                        Nothing needs attention — no errored bots, no suspended accounts, maintenance off.
                      </p>
                    ) : null}
                    {shell.alerts.map((n) => (
                      <Link
                        key={n.title + n.detail}
                        href={n.href}
                        onClick={() => setMenu("none")}
                        className="flex gap-2.5 border-b border-line/60 px-3 py-2.5 transition-colors last:border-0 hover:bg-raised/60"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.tone }} />
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-medium text-ink">{n.title}</span>
                          <span className="block truncate text-[10.5px] text-faint">{n.detail}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

              <a
                href={`https://${shell.host}/console`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary h-[30px] px-2.5 text-[12px]"
              >
                <ArrowUpRight size={13} strokeWidth={2.6} />
                <span className="hidden sm:inline">Product console</span>
              </a>
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-4 pb-14 pt-5 lg:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 grid-bg opacity-[0.55]" />
          <div className="relative mx-auto w-full max-w-[1320px]">{children}</div>
        </main>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-3 text-[10.5px] text-faint lg:px-7">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1 w-1 rounded-full", shell.connected ? "bg-brand" : "bg-[#ff5d6c]")} /> {shell.host}
            </span>
            <span className="hidden sm:inline">botforge admin · live data only</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="hover:text-muted">
              Diagnostics
            </Link>
            <a href={`https://${shell.host}/api/health`} target="_blank" rel="noreferrer" className="hover:text-muted">
              Product health
            </a>
            <span className="flex items-center gap-1">
              <RefreshCw size={10} /> figures refresh on every page load
            </span>
          </div>
        </footer>
      </div>

      {paletteOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div
            className="w-full max-w-[520px] animate-rise overflow-hidden rounded-xl border border-line bg-panel shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line/80 px-3.5 py-3">
              <Search size={15} className="text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onPaletteKey}
                placeholder="Jump to a page…"
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
              />
              <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-faint">esc</span>
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-1.5">
              {results.length === 0 ? <p className="px-3 py-8 text-center text-[12px] text-faint">No matches</p> : null}
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.href}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => {
                      router.push(r.href);
                      setPaletteOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12.5px] transition-colors",
                      cursor === i ? "bg-brand/10 text-ink" : "text-muted hover:bg-raised",
                    )}
                  >
                    <Icon size={14} className={cursor === i ? "text-brand" : "text-faint"} />
                    <span className="flex-1">{r.label}</span>
                    <span className="text-[10px] text-faint">{r.hint}</span>
                    <ArrowRight size={11} className="text-faint" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-line/80 px-3.5 py-2 text-[10px] text-faint">
              <span className="flex items-center gap-1">
                <span className="rounded border border-line bg-raised px-1">↑</span>
                <span className="rounded border border-line bg-raised px-1">↓</span> navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="rounded border border-line bg-raised px-1">↵</span> open
              </span>
              <span className="ml-auto">{shell.bots} bots · {shell.users} accounts</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

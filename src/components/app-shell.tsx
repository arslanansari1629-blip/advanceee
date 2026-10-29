"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  ChevronsUpDown,
  CircleHelp,
  Command,
  CreditCard,
  Flag,
  Gauge,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  PanelsTopLeft,
  Plus,
  Search,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/format";
import { Avatar } from "./ui";
import { useToast } from "./toast";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string; hint?: string };

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Command",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, hint: "Fleet KPIs, traffic, revenue" },
      { href: "/admin/activity", label: "Activity", icon: Activity, badge: "14", hint: "Live event stream" },
    ],
  },
  {
    title: "Fleet",
    items: [
      { href: "/admin/bots", label: "Bots", icon: Bot, badge: "34", hint: "All deployed bots" },
      { href: "/admin/logs", label: "Live logs", icon: Terminal, hint: "Streaming console" },
      { href: "/admin/templates", label: "Templates", icon: PanelsTopLeft, hint: "Starter code library" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, hint: "Accounts, plans, roles" },
      { href: "/admin/revenue", label: "Revenue", icon: CreditCard, hint: "MRR, invoices, churn" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/tickets", label: "Support", icon: Inbox, badge: "3", hint: "Tickets & abuse reports" },
      { href: "/admin/flags", label: "Feature flags", icon: Flag, hint: "Rollouts & kill switches" },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, hint: "Every admin action" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/health", label: "Health", icon: Gauge, hint: "Uptime & incidents" },
      { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Workspace configuration" },
    ],
  },
];

const quickActions = [
  { label: "Deploy a new bot", href: "/admin/bots?new=1", icon: Plus },
  { label: "Open live log console", href: "/admin/logs", icon: Terminal },
  { label: "Review open tickets", href: "/admin/tickets", icon: Inbox },
  { label: "Toggle feature flags", href: "/admin/flags", icon: Flag },
  { label: "Audit trail", href: "/admin/audit", icon: ScrollText },
];

const notifications = [
  {
    title: "INC-2291 elevated latency in fra1",
    body: "Webhook p95 812ms · monitoring",
    tone: "#f5b544",
    time: "6m",
    href: "/admin/health",
  },
  {
    title: "New abuse report · TCK-4818",
    body: "Bot impersonating a bank — needs triage",
    tone: "#ff5d6c",
    time: "12m",
    href: "/admin/tickets",
  },
  {
    title: "Compile queue drained",
    body: "14 pending bots compiled successfully",
    tone: "#34e0a1",
    time: "48m",
    href: "/admin/logs",
  },
  {
    title: "Flag token-rotation-guard at 64%",
    body: "Rollout progressing in production",
    tone: "#8b7cff",
    time: "2h",
    href: "/admin/flags",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [menu, setMenu] = useState<"none" | "bell" | "user" | "org">("none");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [clock, setClock] = useState("");
  const [org, setOrg] = useState("BotForge Cloud");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = (localStorage.getItem("bf-theme") as "dark" | "light") || "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
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

  const allNav = navSections.flatMap((s) => s.items);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navMatches = allNav.filter(
      (n) => !q || n.label.toLowerCase().includes(q) || (n.hint ?? "").toLowerCase().includes(q),
    );
    const actionMatches = quickActions.filter((a) => !q || a.label.toLowerCase().includes(q));
    return { navMatches, actionMatches };
  }, [query, allNav]);

  const flatResults = useMemo(
    () => [
      ...results.navMatches.map((r) => ({ label: r.label, href: r.href, kind: "Page" })),
      ...results.actionMatches.map((r) => ({ label: r.label, href: r.href, kind: "Action" })),
    ],
    [results],
  );

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
      setCursor((c) => Math.min(flatResults.length - 1, c + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === "Enter" && flatResults[cursor]) {
      router.push(flatResults[cursor].href);
      setPaletteOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* sidebar */}
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

        {/* org switcher */}
        <div className="relative px-2.5">
          <button
            onClick={() => setMenu(menu === "org" ? "none" : "org")}
            className="nav-item flex w-full items-center gap-2 rounded-lg border border-line/70 bg-raised/50 px-2 py-1.5 text-left transition-colors hover:border-faint/50"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/15 text-[10px] font-bold text-brand">
              BF
            </span>
            <span className="sidebar-label min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium text-ink">{org}</span>
              <span className="flex items-center gap-1 text-[9.5px] text-faint">
                <span className="h-1 w-1 rounded-full bg-brand" /> production · scale
              </span>
            </span>
            <ChevronsUpDown size={12} className="sidebar-label shrink-0 text-faint" />
          </button>
          {menu === "org" ? (
            <div className="absolute left-2.5 right-2.5 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-panel shadow-pop">
              {["BotForge Cloud", "Arslan Labs", "Demo workspace"].map((o) => (
                <button
                  key={o}
                  onClick={() => {
                    setOrg(o);
                    setMenu("none");
                    push({ kind: "info", title: "Workspace switched", body: `${o} · production` });
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-raised",
                    o === org ? "text-ink" : "text-muted",
                  )}
                >
                  {o}
                  {o === org ? <span className="text-[10px] text-brand">current</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <nav className="mt-3 flex-1 overflow-y-auto px-2.5 pb-3">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <div className="sidebar-label mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-faint/80">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "nav-item group relative flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[12.5px] transition-colors",
                        active
                          ? "bg-brand/10 text-ink"
                          : "text-muted hover:bg-raised/70 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand" />
                      ) : null}
                      <Icon size={15} strokeWidth={2} className={cn("shrink-0", active ? "text-brand" : "text-faint group-hover:text-muted")} />
                      <span className="sidebar-label flex-1 truncate font-medium">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={cn(
                            "sidebar-label rounded-full px-1.5 py-px text-[9.5px] font-semibold",
                            active ? "bg-brand/20 text-brand" : "bg-raised text-faint",
                          )}
                        >
                          {item.badge}
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
            <Sparkles size={11} className="text-[#b3a8ff]" /> Fleet capacity
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-[15px] font-semibold text-ink">62%</span>
            <span className="text-[10px] text-faint">of 2M updates</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-[#8b7cff]" style={{ width: "62%" }} />
          </div>
          <Link href="/admin/revenue" className="mt-2 flex items-center gap-1 text-[10.5px] font-medium text-[#b3a8ff] hover:underline">
            Upgrade quota <ArrowRight size={10} />
          </Link>
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
              aria-label="Help"
              onClick={() => push({ kind: "info", title: "Docs", body: "Keyboard: ⌘K palette, / search, T theme." })}
            >
              <CircleHelp size={14} />
            </button>
            <div className="relative ml-auto">
              <button
                onClick={() => setMenu(menu === "user" ? "none" : "user")}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-raised"
              >
                <Avatar name="Arslan Ansari" color="#34e0a1" size={26} />
                <span className="sidebar-label text-left">
                  <span className="block text-[11.5px] font-medium leading-tight text-ink">Arslan</span>
                  <span className="block text-[9.5px] leading-tight text-faint">owner</span>
                </span>
              </button>
              {menu === "user" ? (
                <div className="absolute bottom-full left-0 z-50 mb-1 w-56 overflow-hidden rounded-lg border border-line bg-panel shadow-pop">
                  <div className="border-b border-line/80 px-3 py-2">
                    <p className="text-[12px] font-medium text-ink">Arslan Ansari</p>
                    <p className="text-[10.5px] text-faint">arslan@forge.dev · owner</p>
                  </div>
                  <Link href="/admin/settings" className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted hover:bg-raised hover:text-ink">
                    <Settings size={13} /> Workspace settings
                  </Link>
                  <Link href="/admin/audit" className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted hover:bg-raised hover:text-ink">
                    <ShieldCheck size={13} /> Security & audit
                  </Link>
                  <button
                    onClick={() => push({ kind: "info", title: "Signed out (demo)", body: "Session cookie cleared in the demo shell." })}
                    className="flex w-full items-center gap-2 border-t border-line/80 px-3 py-2 text-[12px] text-[#ff8a94] hover:bg-[#ff5d6c]/10"
                  >
                    <LogOut size={13} /> Sign out
                  </button>
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

      {/* main */}
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
                <span className="w-28 text-left">Search console…</span>
                <span className="flex items-center gap-0.5 rounded border border-line bg-canvas px-1 py-px text-[9.5px]">
                  <Command size={8} /> K
                </span>
              </button>

              <div className="hidden items-center gap-1.5 rounded-full border border-[#34e0a1]/25 bg-[#34e0a1]/[0.07] px-2 py-1 text-[10.5px] font-medium text-[#5eeac0] lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34e0a1] live-dot" />
                All systems operational
              </div>

              <div className="hidden items-center gap-1.5 font-mono text-[10.5px] text-faint xl:flex">
                <span className="h-1 w-1 rounded-full bg-faint" /> {clock} UTC
              </div>

              <div className="relative">
                <button
                  onClick={() => setMenu(menu === "bell" ? "none" : "bell")}
                  className="relative rounded-lg border border-line bg-raised/40 p-1.5 text-muted transition-colors hover:text-ink"
                  aria-label="Notifications"
                >
                  <Bell size={14} />
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5d6c] text-[8px] font-bold text-white">
                    4
                  </span>
                </button>
                {menu === "bell" ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-line bg-panel shadow-pop">
                    <div className="flex items-center justify-between border-b border-line/80 px-3 py-2">
                      <span className="text-[12px] font-medium text-ink">Notifications</span>
                      <button
                        onClick={() => push({ kind: "success", title: "All notifications marked read" })}
                        className="text-[10.5px] text-faint hover:text-ink"
                      >
                        Mark all read
                      </button>
                    </div>
                    {notifications.map((n) => (
                      <Link
                        key={n.title}
                        href={n.href}
                        onClick={() => setMenu("none")}
                        className="flex gap-2.5 border-b border-line/60 px-3 py-2.5 transition-colors last:border-0 hover:bg-raised/60"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.tone }} />
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-medium text-ink">{n.title}</span>
                          <span className="block truncate text-[10.5px] text-faint">{n.body}</span>
                        </span>
                        <span className="ml-auto shrink-0 text-[9.5px] text-faint">{n.time}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

              <Link href="/admin/bots?new=1" className="btn-primary h-[30px] px-2.5 text-[12px]">
                <Plus size={13} strokeWidth={2.6} />
                <span className="hidden sm:inline">Deploy bot</span>
              </Link>
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
              <span className="h-1 w-1 rounded-full bg-brand" /> botforge-cloud · production
            </span>
            <span className="hidden sm:inline">build 2026.10.29 · vercel iad1</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/health" className="hover:text-muted">
              Status
            </Link>
            <Link href="/admin/settings" className="hover:text-muted">
              Docs
            </Link>
            <span className="flex items-center gap-1">
              <LifeBuoy size={10} /> support@botforge.cloud
            </span>
          </div>
        </footer>
      </div>

      {/* command palette */}
      {paletteOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div
            className="w-full max-w-[540px] animate-rise overflow-hidden rounded-xl border border-line bg-panel shadow-pop"
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
                placeholder="Jump to a page, run an action…"
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
              />
              <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-[10px] text-faint">esc</span>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {flatResults.length === 0 ? (
                <p className="px-3 py-8 text-center text-[12px] text-faint">No matches for “{query}”</p>
              ) : null}
              {results.navMatches.length ? (
                <div className="mb-1">
                  <div className="px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">Pages</div>
                  {results.navMatches.map((r) => {
                    const idx = flatResults.findIndex((f) => f.href === r.href && f.label === r.label);
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.href}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => {
                          router.push(r.href);
                          setPaletteOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12.5px] transition-colors",
                          cursor === idx ? "bg-brand/10 text-ink" : "text-muted hover:bg-raised",
                        )}
                      >
                        <Icon size={14} className={cursor === idx ? "text-brand" : "text-faint"} />
                        <span className="flex-1">{r.label}</span>
                        <span className="text-[10px] text-faint">{r.hint}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {results.actionMatches.length ? (
                <div>
                  <div className="px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">Actions</div>
                  {results.actionMatches.map((r) => {
                    const idx = flatResults.findIndex((f) => f.href === r.href && f.label === r.label);
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.label}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => {
                          router.push(r.href);
                          setPaletteOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12.5px] transition-colors",
                          cursor === idx ? "bg-brand/10 text-ink" : "text-muted hover:bg-raised",
                        )}
                      >
                        <Icon size={14} className={cursor === idx ? "text-brand" : "text-faint"} />
                        <span className="flex-1">{r.label}</span>
                        <ArrowRight size={11} className="text-faint" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3 border-t border-line/80 px-3.5 py-2 text-[10px] text-faint">
              <span className="flex items-center gap-1">
                <span className="rounded border border-line bg-raised px-1">↑</span>
                <span className="rounded border border-line bg-raised px-1">↓</span> navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="rounded border border-line bg-raised px-1">↵</span> open
              </span>
              <span className="ml-auto">BotForge command menu</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShellHint() {
  return null;
}

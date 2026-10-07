import { Link, Outlet, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, AlertTriangle, Bell, FileText, History, LayoutDashboard, Lightbulb, LogOut, Map, Menu, ScanSearch, Search, Settings, X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notificationService } from "@/services/notificationService";
import { authService } from "@/services/authService";
import { getSystemHealth } from "@/lib/system.functions";
import { cn } from "@/lib/utils";

const NAV = [
  { group: "Workspace", items: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/analyze", label: "Analyze", icon: ScanSearch },
    { to: "/fields", label: "Fields", icon: Map },
    { to: "/history", label: "Analysis History", icon: History },
    { to: "/reports", label: "Reports", icon: FileText },
  ] },
  { group: "AI & Insights", items: [
    { to: "/insights", search: { tab: "agent" }, label: "Agent Activity", icon: Activity },
    { to: "/insights", search: { tab: "anomalies" }, label: "Anomalies", icon: AlertTriangle },
    { to: "/insights", search: { tab: "recommendations" }, label: "Recommendations", icon: Lightbulb },
  ] },
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[232px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-[232px] border-r bg-sidebar transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link to="/dashboard"><Logo className="text-sm" /></Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
        <nav className="space-y-5 p-3" aria-label="Main">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="eyebrow px-2 pb-1.5">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.label}>
                    <Link
                      to={it.to}
                      search={"search" in it ? it.search : {}}
                      onClick={() => setOpen(false)}
                      activeOptions={{ includeSearch: "search" in it }}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                      activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground" }}
                    >
                      <it.icon className="h-4 w-4 opacity-70" /> {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent font-medium" }}>
            <Settings className="h-4 w-4 opacity-70" /> Settings
          </Link>
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const [q, setQ] = useState("");
  const notifs = useQuery({ queryKey: ["notifications"], queryFn: notificationService.list, refetchInterval: 15000 });
  const health = useQuery({ queryKey: ["health"], queryFn: () => getSystemHealth(), staleTime: 60000 });
  const unread = notifs.data?.filter((n) => !n.read_at).length ?? 0;
  const vision = health.data?.services.find((s) => s.key === "vision");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await authService.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <button className="lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <form className="relative max-w-sm flex-1" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/history", search: { q } }); }}>
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search analyses, fields, crops…" aria-label="Search" className="h-9 w-full rounded-md border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/settings" search={{ tab: "status" }} className="hidden items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs md:inline-flex" title={vision?.detail}>
          <span className={cn("h-2 w-2 rounded-full", vision?.state === "online" ? "bg-success" : vision?.state === "offline" ? "bg-destructive" : "bg-warning")} />
          {vision?.state === "online" ? "Vision engine online" : "Demo mode"}
        </Link>
        <Popover onOpenChange={(o) => { if (!o && unread) notificationService.markAllRead().then(() => notifs.refetch()); }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} unread)`}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-3 py-2 text-sm font-semibold">Notifications</div>
            <ul className="max-h-80 overflow-auto">
              {notifs.data?.length ? notifs.data.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <a href={n.link ?? "#"} className="block px-3 py-2 text-sm hover:bg-muted">
                    <div className={cn(!n.read_at && "font-medium")}>{n.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </a>
                </li>
              )) : <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</li>}
            </ul>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account" className="rounded-full">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {(user.user_metadata?.["full_name"] || user.email || "?").slice(0, 1).toUpperCase()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.user_metadata?.["full_name"] || "Account"}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

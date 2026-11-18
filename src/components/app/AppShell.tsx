import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, LayoutDashboard, Ticket, Wrench, Monitor, Users, UserCog, BarChart3, Settings, LogOut, Menu, Search, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABEL, type Role } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Nav = { to: string; label: string; icon: typeof Ticket; roles: Role[] };
const NAV: Nav[] = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "technicien", "demandeur"] },
  { to: "/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "technicien", "demandeur"] },
  { to: "/interventions", label: "Interventions", icon: Wrench, roles: ["admin", "technicien"] },
  { to: "/equipements", label: "Parc informatique", icon: Monitor, roles: ["admin", "technicien"] },
  { to: "/techniciens", label: "Techniciens", icon: UserCog, roles: ["admin"] },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, roles: ["admin"] },
  { to: "/rapports", label: "Rapports", icon: BarChart3, roles: ["admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "technicien", "demandeur"] },
  { to: "/parametres", label: "Paramètres", icon: Settings, roles: ["admin", "technicien", "demandeur"] },
];

export function AppShell() {
  const { profile, role, session } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const uid = session?.user.id;
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", uid], enabled: !!uid, refetchInterval: 30000,
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("read", false)).count ?? 0,
  });
  const items = NAV.filter((n) => role && n.roles.includes(role));
  const current = items.find((n) => path.startsWith(n.to))?.label ?? "FixIT";

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/tableau-de-bord" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/20 glow"><Wrench className="size-4 text-cyan" /></span>
        <span className="text-lg font-semibold tracking-tight">Fix<span className="text-cyan">IT</span></span>
      </Link>
      <div className="eyebrow px-5 pb-2 pt-3">Navigation</div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((n) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-cyan)]" }}>
            <n.icon className="size-4 opacity-80" />
            <span className="flex-1">{n.label}</span>
            {n.to === "/notifications" && unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>}
          </Link>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
        <Link to="/profil" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/25 text-sm font-semibold text-cyan">{profile?.full_name?.split(" ").map((x) => x[0]).slice(0, 2).join("") ?? "?"}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{profile?.full_name ?? "…"}</span>
            <span className="block text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</span>
          </span>
        </Link>
        <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <LogOut className="size-3.5" /> Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar">
            <button className="absolute right-3 top-5 text-muted-foreground" onClick={() => setOpen(false)} aria-label="Fermer"><X className="size-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="size-5" /></button>
          <span className="hidden text-sm text-muted-foreground md:block">{current}</span>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Rechercher un ticket (réf., titre)…"
              onKeyDown={(e) => { if (e.key === "Enter") navigate({ to: "/tickets", search: { q: (e.target as HTMLInputElement).value } }); }}
              className="h-9 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring" />
          </div>
          <Link to="/notifications" className="relative grid size-9 place-items-center rounded-lg border border-border bg-surface" aria-label="Notifications">
            <Bell className="size-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-cyan" />}
          </Link>
          {role !== "technicien" && (
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/tickets/nouveau"><Plus className="size-4" /> Nouveau ticket</Link></Button>
          )}
        </header>
        <main className={cn("relative px-4 py-8 md:px-8")}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 halo-bg" />
          <div className="relative mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

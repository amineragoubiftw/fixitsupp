import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Clock, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal, useCountUp } from "@/lib/anim";
import { OPEN_STATUSES, ROLE_LABEL, STATUS_LABEL, fmtDateTime, type TicketStatus, type Priority } from "@/lib/labels";
import { PageHeader, StatusPill, PriorityTag, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord — FixIT" }, { name: "description", content: "Vue d'ensemble de l'activité du support informatique." }, { property: "og:title", content: "Tableau de bord — FixIT" }, { property: "og:description", content: "Vue d'ensemble de l'activité du support informatique." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Ticket; tone: string }) {
  const ref = useCountUp(value);
  return (
    <div data-reveal className="surface-card p-5">
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className={`size-4 ${tone}`} /></div>
      <div className="mt-4 text-3xl font-semibold tabular-nums"><span ref={ref}>0</span></div>
    </div>
  );
}

function Dashboard() {
  const { profile, role } = useAuth();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", "dash"],
    queryFn: async () => (await supabase.from("tickets").select("id,reference,title,status,priority,created_at").order("created_at", { ascending: false })).data ?? [],
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status as TicketStatus)).length;
  const critical = tickets.filter((t) => t.priority === "critique" && OPEN_STATUSES.includes(t.status as TicketStatus)).length;
  const resolved = tickets.filter((t) => t.status === "resolu" || t.status === "cloture").length;
  const byStatus = (Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => ({ s, n: tickets.filter((t) => t.status === s).length }));
  const max = Math.max(1, ...byStatus.map((x) => x.n));

  return (
    <div ref={ref}>
      <PageHeader eyebrow={role ? ROLE_LABEL[role] : ""} title={`Bonjour, ${profile?.full_name?.split(" ")[0] ?? ""}`} desc="Voici l'état du support informatique aujourd'hui." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tickets au total" value={tickets.length} icon={Ticket} tone="text-cyan" />
        <Kpi label="En cours de traitement" value={open} icon={Clock} tone="text-primary" />
        <Kpi label="Critiques ouverts" value={critical} icon={AlertTriangle} tone="text-danger" />
        <Kpi label="Résolus / clôturés" value={resolved} icon={CheckCircle2} tone="text-success" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div data-reveal className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Tickets récents</h2><Link to="/tickets" search={{ q: undefined }} className="flex items-center gap-1 text-xs text-cyan">Tout voir <ArrowUpRight className="size-3" /></Link></div>
          {tickets.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucun ticket"} /> : (
            <ul className="divide-y divide-border">
              {tickets.slice(0, 7).map((t) => (
                <li key={t.id}><Link to="/tickets/$id" params={{ id: t.id }} className="flex items-center gap-4 py-3 hover:text-cyan">
                  <span className="w-24 font-mono text-xs text-muted-foreground">{t.reference}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <PriorityTag p={t.priority as Priority} />
                  <StatusPill s={t.status as TicketStatus} />
                  <span className="hidden w-28 text-right text-xs text-muted-foreground md:block">{fmtDateTime(t.created_at)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </div>
        <div data-reveal className="surface-card p-5">
          <h2 className="mb-4 font-medium">Répartition par statut</h2>
          <div className="space-y-3">
            {byStatus.map(({ s, n }) => (
              <div key={s}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{STATUS_LABEL[s]}</span><span className="tabular-nums">{n}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan" style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

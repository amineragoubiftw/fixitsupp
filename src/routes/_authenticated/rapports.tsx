import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { PageHeader, Empty } from "@/components/app/ui-bits";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, OPEN_STATUSES, fmtHours, mttrHours, downloadCsv, type Category, type Priority, type TicketStatus } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — FixIT" }, { name: "description", content: "Statistiques, MTTR et pannes récurrentes." }, { property: "og:title", content: "Rapports — FixIT" }, { property: "og:description", content: "Statistiques, MTTR et pannes récurrentes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div data-reveal className="surface-card p-5">
      <div className="eyebrow mb-4">{title}</div>
      <div className="grid gap-2.5">
        {data.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[140px_1fr_36px] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{k}</span>
            <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Page() {
  const { role } = useAuth();
  const [days, setDays] = useState(90);
  const { data, isLoading } = useQuery({
    queryKey: ["reports", days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ data: t }, { data: i }] = await Promise.all([
        supabase.from("tickets").select("id,reference,title,status,priority,category,created_at,resolved_at,equipment_id,equipment(asset_tag,name)").gte("created_at", since),
        supabase.from("interventions").select("labor_cost,intervention_materials(quantity,unit_cost)").gte("started_at", since),
      ]);
      return { tickets: (t ?? []) as any[], interventions: (i ?? []) as any[] };
    },
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  if (role === "demandeur") return <Empty title="Accès réservé" desc="Les rapports sont réservés à l'équipe technique." />;
  const t = data?.tickets ?? [];
  const count = <K extends string>(key: string, labels: Record<K, string>) => (Object.keys(labels) as K[]).map((k) => [labels[k], t.filter((x) => x[key] === k).length] as [string, number]);
  const months = new Map<string, number>();
  t.forEach((x) => { const m = new Date(x.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }); months.set(m, (months.get(m) ?? 0) + 1); });
  const eqMap = new Map<string, number>();
  t.filter((x) => x.equipment).forEach((x) => { const k = `${x.equipment.asset_tag} · ${x.equipment.name}`; eqMap.set(k, (eqMap.get(k) ?? 0) + 1); });
  const recurrent = [...eqMap].filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const cost = (data?.interventions ?? []).reduce((a, i) => a + Number(i.labor_cost) + (i.intervention_materials ?? []).reduce((s: number, m: any) => s + m.quantity * Number(m.unit_cost), 0), 0);
  const kpis = [
    ["Tickets", String(t.length)],
    ["Ouverts", String(t.filter((x) => OPEN_STATUSES.includes(x.status)).length)],
    ["MTTR", fmtHours(mttrHours(t))],
    ["Coût interventions", cost.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })],
  ];
  return (
    <div ref={ref}>
      <PageHeader eyebrow="Pilotage" title="Rapports et statistiques" desc="Volumes, délais de résolution et pannes récurrentes."
        actions={<>
          <select aria-label="Période" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-surface px-3 text-sm">
            <option value={30}>30 derniers jours</option><option value={90}>90 derniers jours</option><option value={365}>12 derniers mois</option><option value={3650}>Tout</option>
          </select>
          <Button variant="outline" onClick={() => downloadCsv("tickets.csv", t.map((x) => ({ reference: x.reference, titre: x.title, statut: STATUS_LABEL[x.status as TicketStatus], priorite: PRIORITY_LABEL[x.priority as Priority], categorie: CATEGORY_LABEL[x.category as Category], cree_le: x.created_at, resolu_le: x.resolved_at ?? "" })))}>Exporter CSV</Button>
        </>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([k, v]) => <div key={k} data-reveal className="surface-card p-5"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bars title="Par catégorie" data={count("category", CATEGORY_LABEL)} />
        <Bars title="Par priorité" data={count("priority", PRIORITY_LABEL)} />
        <Bars title="Par statut" data={count("status", STATUS_LABEL)} />
        <Bars title="Par mois" data={[...months].reverse()} />
      </div>
      <div data-reveal className="surface-card mt-4 p-5">
        <div className="eyebrow mb-3">Pannes récurrentes (≥ 2 tickets)</div>
        {recurrent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun équipement récurrent sur la période.</p> :
          <ul className="grid gap-2 text-sm">{recurrent.map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="font-medium text-warning">{v} tickets</span></li>)}</ul>}
      </div>
    </div>
  );
}

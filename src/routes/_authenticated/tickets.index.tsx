import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, STATUS_LABEL, fmtDate, type Category, type Priority, type TicketStatus } from "@/lib/labels";
import { PageHeader, StatusPill, PriorityTag, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/tickets/")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined }),
  head: () => ({ meta: [{ title: "Tickets — FixIT" }, { name: "description", content: "Liste et suivi des demandes de support." }, { property: "og:title", content: "Tickets — FixIT" }, { property: "og:description", content: "Liste et suivi des demandes de support." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Tickets,
});

function Tickets() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/tickets/" });
  const { role } = useAuth();
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets", "list"],
    queryFn: async () => (await supabase.from("tickets").select("id,reference,title,status,priority,category,created_at").order("created_at", { ascending: false })).data ?? [],
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  const rows = data.filter((t) => (status === "all" || t.status === status) && (!q || `${t.reference} ${t.title}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div ref={ref}>
      <PageHeader eyebrow="Support" title="Tickets" desc={role === "demandeur" ? "Vos demandes et leur avancement." : role === "technicien" ? "Les tickets qui vous sont affectés." : "Toutes les demandes de l'établissement."}
        actions={role !== "technicien" && <Button asChild><Link to="/tickets/nouveau"><Plus className="size-4" /> Nouveau ticket</Link></Button>} />
      <div data-reveal className="mb-4 flex flex-wrap gap-2">
        <input defaultValue={q ?? ""} placeholder="Filtrer…" onChange={(e) => navigate({ search: { q: e.target.value || undefined }, replace: true })}
          className="h-9 w-56 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring" />
        {(["all", ...Object.keys(STATUS_LABEL)] as (TicketStatus | "all")[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${status === s ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "Tous" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucun ticket"} desc="Modifiez les filtres ou créez une demande." /> : (
        <div data-reveal className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Référence</th><th className="px-4 py-3 font-medium">Titre</th><th className="px-4 py-3 font-medium">Catégorie</th><th className="px-4 py-3 font-medium">Priorité</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium">Créé le</th>
            </tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/40" onClick={() => navigate({ to: "/tickets/$id", params: { id: t.id } })}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABEL[t.category as Category]}</td>
                  <td className="px-4 py-3"><PriorityTag p={t.priority as Priority} /></td>
                  <td className="px-4 py-3"><StatusPill s={t.status as TicketStatus} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/lib/anim";
import { CATEGORY_LABEL, STATUS_LABEL, fmtDateTime, type Category, type Priority, type TicketStatus } from "@/lib/labels";
import { TicketActions, TicketComments } from "@/components/app/TicketActions";
import { PageHeader, StatusPill, PriorityTag, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/tickets/$id")({
  head: () => ({ meta: [{ title: "Détail du ticket — FixIT" }, { name: "description", content: "Détail, historique et suivi d'un ticket." }, { property: "og:title", content: "Détail du ticket — FixIT" }, { property: "og:description", content: "Détail, historique et suivi d'un ticket." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TicketDetail,
});

function TicketDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const [{ data: t }, { data: h }] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
        supabase.from("ticket_history").select("*").eq("ticket_id", id).order("created_at", { ascending: false }),
      ]);
      return { t, h: h ?? [] };
    },
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  if (!data?.t) return <Empty title={isLoading ? "Chargement…" : "Ticket introuvable"} />;
  const t = data.t;
  return (
    <div ref={ref}>
      <Link to="/tickets" search={{ q: undefined }} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> Retour aux tickets</Link>
      <PageHeader eyebrow={t.reference} title={t.title} actions={<StatusPill s={t.status as TicketStatus} />} />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div data-reveal className="surface-card p-5">
          <h2 className="mb-2 font-medium">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>
          {t.rejection_reason && <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm">Motif de refus : {t.rejection_reason}</p>}
          <h2 className="mb-3 mt-8 font-medium">Commentaires</h2>
          <TicketComments ticketId={t.id} />
          <h2 className="mb-3 mt-8 font-medium">Historique</h2>
          <ol className="space-y-3 border-l border-border pl-4">
            {data.h.map((h) => {
              const r = h as Record<string, unknown>;
              return <li key={String(r["id"])} className="text-sm"><span className="text-xs text-muted-foreground">{fmtDateTime(String(r["created_at"]))}</span><div>{String(r["action"])}{r["to_status"] ? ` → ${STATUS_LABEL[r["to_status"] as TicketStatus]}` : ""}{r["details"] ? ` — ${String(r["details"])}` : ""}</div></li>;
            })}
            {data.h.length === 0 && <li className="text-sm text-muted-foreground">Aucun événement.</li>}
          </ol>
        </div>
        <div data-reveal className="surface-card space-y-4 p-5 text-sm">
          <div><div className="eyebrow mb-1">Priorité</div><PriorityTag p={t.priority as Priority} /></div>
          <div><div className="eyebrow mb-1">Catégorie</div>{CATEGORY_LABEL[t.category as Category]}</div>
          <div><div className="eyebrow mb-1">Créé le</div>{fmtDateTime(t.created_at)}</div>
          <div><div className="eyebrow mb-1">Résolu le</div>{fmtDateTime(t.resolved_at)}</div>
          <div className="border-t border-border pt-4"><div className="eyebrow mb-3">Actions</div><TicketActions t={t} /></div>
        </div>
      </div>
    </div>
  );
}

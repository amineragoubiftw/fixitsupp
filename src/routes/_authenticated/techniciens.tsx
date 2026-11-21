import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Empty, Pill } from "@/components/app/ui-bits";
import { OPEN_STATUSES, fmtHours, mttrHours } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/techniciens")({
  head: () => ({ meta: [{ title: "Techniciens — FixIT" }, { name: "description", content: "Équipe technique, disponibilité et charge de travail." }, { property: "og:title", content: "Techniciens — FixIT" }, { property: "og:description", content: "Équipe technique, disponibilité et charge de travail." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "technicien");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return { techs: [], tickets: [] };
      const [{ data: techs }, { data: tickets }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,phone,specialization,available").in("id", ids).order("full_name"),
        supabase.from("tickets").select("assigned_to,status,created_at,resolved_at").in("assigned_to", ids),
      ]);
      return { techs: techs ?? [], tickets: tickets ?? [] };
    },
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  const techs = data?.techs ?? [];
  const tickets = data?.tickets ?? [];
  const maxLoad = Math.max(1, ...techs.map((t) => tickets.filter((x) => x.assigned_to === t.id && OPEN_STATUSES.includes(x.status as never)).length));

  async function toggle(id: string, available: boolean) {
    const { error } = await supabase.from("profiles").update({ available }).eq("id", id);
    if (error) { toast.error("Mise à jour impossible"); return; }
    toast.success(available ? "Technicien disponible" : "Technicien indisponible");
    qc.invalidateQueries({ queryKey: ["technicians"] });
  }

  return (
    <div ref={ref}>
      <PageHeader eyebrow="Équipe" title="Techniciens" desc="Disponibilité, spécialités et charge de travail de l'équipe technique." />
      {techs.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucun technicien"} desc="Ajoutez des techniciens depuis la page Utilisateurs." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {techs.map((t) => {
            const mine = tickets.filter((x) => x.assigned_to === t.id);
            const open = mine.filter((x) => OPEN_STATUSES.includes(x.status as never)).length;
            const done = mine.filter((x) => x.status === "resolu" || x.status === "cloture").length;
            return (
              <div key={t.id} data-reveal className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-primary/15 font-semibold text-primary">{t.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</div>
                    <div><div className="font-medium">{t.full_name}</div><div className="text-xs text-muted-foreground">{t.specialization ?? "Généraliste"}</div></div>
                  </div>
                  {role === "admin" ? <Switch checked={t.available} onCheckedChange={(v) => toggle(t.id, v)} aria-label="Disponibilité" />
                    : <Pill className={t.available ? "text-success border-success/30 bg-success/10" : "text-muted-foreground border-border"}>{t.available ? "Disponible" : "Indisponible"}</Pill>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-lg font-semibold">{open}</div><div className="text-[11px] text-muted-foreground">En cours</div></div>
                  <div><div className="text-lg font-semibold">{done}</div><div className="text-[11px] text-muted-foreground">Résolus</div></div>
                  <div><div className="text-lg font-semibold">{fmtHours(mttrHours(mine))}</div><div className="text-[11px] text-muted-foreground">MTTR</div></div>
                </div>
                <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Charge</span><span>{open} ticket(s) ouvert(s)</span></div>
                  <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(open / maxLoad) * 100}%` }} /></div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{t.email}{t.phone ? ` · ${t.phone}` : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

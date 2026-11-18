import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/lib/anim";
import { EQ_STATUS_LABEL, EQ_STATUS_TONE, type EquipmentStatus } from "@/lib/labels";
import { PageHeader, Pill, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/equipements")({
  head: () => ({ meta: [{ title: "Parc informatique — FixIT" }, { name: "description", content: "Inventaire des équipements informatiques." }, { property: "og:title", content: "Parc informatique — FixIT" }, { property: "og:description", content: "Inventaire des équipements informatiques." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Equipment,
});

function Equipment() {
  const { data = [], isLoading } = useQuery({ queryKey: ["equipment"], queryFn: async () => (await supabase.from("equipment").select("id,asset_tag,name,brand,model,status").order("asset_tag")).data ?? [] });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  return (
    <div ref={ref}>
      <PageHeader eyebrow="Inventaire" title="Parc informatique" desc="Tous les équipements suivis par le service." />
      {data.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucun équipement"} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <div key={e.id} data-reveal className="surface-card p-4">
              <div className="flex items-start justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">{e.asset_tag}</span><Pill className={EQ_STATUS_TONE[e.status as EquipmentStatus]}>{EQ_STATUS_LABEL[e.status as EquipmentStatus]}</Pill></div>
              <div className="mt-3 font-medium">{e.name}</div>
              <div className="text-sm text-muted-foreground">{[e.brand, e.model].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

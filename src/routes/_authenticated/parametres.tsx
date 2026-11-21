import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — FixIT" }, { name: "description", content: "Configuration de l'organisation, délais et référentiels." }, { property: "og:title", content: "Paramètres — FixIT" }, { property: "og:description", content: "Configuration de l'organisation, délais et référentiels." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const inputCls = "h-9 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring";
type Org = { name: string; sla_critique_h: number; sla_haute_h: number; sla_moyenne_h: number; sla_basse_h: number };

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"], enabled: role === "admin",
    queryFn: async () => {
      const [{ data: s }, { data: d }, { data: b }, { data: r }] = await Promise.all([
        supabase.from("system_settings").select("value").eq("key", "organisation").maybeSingle(),
        supabase.from("departments").select("id,name").order("name"),
        supabase.from("buildings").select("id,name").order("name"),
        supabase.from("rooms").select("id,name,building_id").order("name"),
      ]);
      return { org: (s?.value ?? { name: "", sla_critique_h: 4, sla_haute_h: 24, sla_moyenne_h: 72, sla_basse_h: 168 }) as Org, depts: d ?? [], buildings: b ?? [], rooms: r ?? [] };
    },
  });
  const [org, setOrg] = useState<Org | null>(null);
  useEffect(() => { if (data) setOrg(data.org); }, [data]);
  const ref = useReveal<HTMLDivElement>([isLoading]);
  if (role !== "admin") return <Empty title="Accès réservé" desc="Cette page est réservée aux administrateurs." />;
  const refresh = () => qc.invalidateQueries({ queryKey: ["settings"] });

  async function saveOrg() {
    if (!org) return;
    const { error } = await supabase.from("system_settings").upsert({ key: "organisation", value: org as never, updated_at: new Date().toISOString() });
    if (error) { toast.error("Enregistrement impossible"); return; } toast.success("Paramètres enregistrés");
  }
  async function add(table: "departments" | "buildings", name: string) {
    if (!name.trim()) return;
    const { error } = await supabase.from(table).insert({ name: name.trim() });
    if (error) { toast.error("Ajout impossible"); return; } toast.success("Ajouté"); refresh();
  }
  async function addRoom(building_id: string, name: string) {
    if (!name.trim() || !building_id) return;
    const { error } = await supabase.from("rooms").insert({ name: name.trim(), building_id });
    if (error) { toast.error("Ajout impossible"); return; } toast.success("Salle ajoutée"); refresh();
  }
  async function remove(table: "departments" | "buildings" | "rooms", id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error("Suppression impossible : élément encore utilisé"); return; } toast.success("Supprimé"); refresh();
  }
  const slas: [keyof Org, string][] = [["sla_critique_h", "Critique"], ["sla_haute_h", "Haute"], ["sla_moyenne_h", "Moyenne"], ["sla_basse_h", "Basse"]];

  return (
    <div ref={ref}>
      <PageHeader eyebrow="Administration" title="Paramètres" desc="Organisation, délais de résolution cibles et référentiels." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div data-reveal className="surface-card p-5">
          <div className="eyebrow mb-4">Organisation et SLA</div>
          {org && <div className="grid gap-3 text-sm">
            <label className="grid gap-1">Nom de l'établissement<input className={inputCls} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              {slas.map(([k, l]) => <label key={k} className="grid gap-1">Priorité {l} (heures)<input type="number" min="1" className={inputCls} value={org[k] as number} onChange={(e) => setOrg({ ...org, [k]: Number(e.target.value) })} /></label>)}
            </div>
            <Button onClick={saveOrg}>Enregistrer</Button>
          </div>}
        </div>
        <ListCard title="Services" items={data?.depts ?? []} onAdd={(n) => add("departments", n)} onRemove={(id) => remove("departments", id)} />
        <ListCard title="Bâtiments" items={data?.buildings ?? []} onAdd={(n) => add("buildings", n)} onRemove={(id) => remove("buildings", id)} />
        <RoomsCard buildings={data?.buildings ?? []} rooms={data?.rooms ?? []} onAdd={addRoom} onRemove={(id) => remove("rooms", id)} />
      </div>
    </div>
  );
}

function ListCard({ title, items, onAdd, onRemove }: { title: string; items: { id: string; name: string }[]; onAdd: (n: string) => void; onRemove: (id: string) => void }) {
  const [n, setN] = useState("");
  return (
    <div data-reveal className="surface-card p-5">
      <div className="eyebrow mb-4">{title}</div>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); onAdd(n); setN(""); }}><input placeholder="Nouveau…" className={inputCls} value={n} onChange={(e) => setN(e.target.value)} /><Button type="submit">Ajouter</Button></form>
      <ul className="grid gap-1 text-sm">{items.map((i) => <li key={i.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent/40">{i.name}<Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => onRemove(i.id)}><Trash2 className="size-4" /></Button></li>)}</ul>
    </div>
  );
}

function RoomsCard({ buildings, rooms, onAdd, onRemove }: { buildings: { id: string; name: string }[]; rooms: { id: string; name: string; building_id: string }[]; onAdd: (b: string, n: string) => void; onRemove: (id: string) => void }) {
  const [n, setN] = useState(""); const [b, setB] = useState("");
  return (
    <div data-reveal className="surface-card p-5">
      <div className="eyebrow mb-4">Salles</div>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); onAdd(b, n); setN(""); }}>
        <select aria-label="Bâtiment" className={inputCls + " max-w-40"} value={b} onChange={(e) => setB(e.target.value)}><option value="">Bâtiment…</option>{buildings.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input placeholder="Salle…" className={inputCls} value={n} onChange={(e) => setN(e.target.value)} /><Button type="submit">Ajouter</Button>
      </form>
      <ul className="grid max-h-72 gap-1 overflow-y-auto text-sm">{rooms.map((r) => <li key={r.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent/40"><span>{r.name} <span className="text-xs text-muted-foreground">· {buildings.find((x) => x.id === r.building_id)?.name}</span></span><Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => onRemove(r.id)}><Trash2 className="size-4" /></Button></li>)}</ul>
    </div>
  );
}

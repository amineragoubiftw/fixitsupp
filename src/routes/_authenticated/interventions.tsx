import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Empty, Pill } from "@/components/app/ui-bits";
import { RESULT_LABEL, fmtDateTime, fmtMoney, downloadCsv } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/interventions")({
  head: () => ({ meta: [{ title: "Interventions — FixIT" }, { name: "description", content: "Suivi des interventions techniques et comptes rendus." }, { property: "og:title", content: "Interventions — FixIT" }, { property: "og:description", content: "Suivi des interventions techniques et comptes rendus." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const inputCls = "h-9 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring";
type Mat = { name: string; quantity: number; unit_cost: number };

function Page() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["interventions"],
    queryFn: async () => (await supabase.from("interventions").select("*, tickets(reference,title), profiles!interventions_technician_id_fkey(full_name), intervention_materials(*)").order("started_at", { ascending: false })).data ?? [],
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  const total = (i: any) => Number(i.labor_cost) + (i.intervention_materials ?? []).reduce((a: number, m: any) => a + m.quantity * Number(m.unit_cost), 0);

  async function remove(id: string) {
    if (!confirm("Supprimer ce rapport d'intervention ?")) return;
    await supabase.from("intervention_materials").delete().eq("intervention_id", id);
    const { error } = await supabase.from("interventions").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");
    toast.success("Intervention supprimée");
    qc.invalidateQueries({ queryKey: ["interventions"] });
  }

  return (
    <div ref={ref}>
      <PageHeader eyebrow="Maintenance" title="Interventions" desc="Diagnostics, travaux réalisés, pièces utilisées et coûts."
        actions={<>
          <Button variant="outline" onClick={() => downloadCsv("interventions.csv", data.map((i: any) => ({ reference: i.reference, ticket: i.tickets?.reference, technicien: i.profiles?.full_name, debut: i.started_at, fin: i.ended_at, resultat: RESULT_LABEL[i.result] ?? i.result, cout_total: total(i) })))}>Exporter CSV</Button>
          {role !== "demandeur" && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nouveau rapport</Button>}
        </>} />
      {data.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucune intervention"} desc="Les rapports d'intervention apparaîtront ici." /> : (
        <div className="grid gap-4">
          {data.map((i: any) => (
            <div key={i.id} data-reveal className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{i.reference} · <Link to="/tickets/$id" params={{ id: i.ticket_id }} className="text-cyan hover:underline">{i.tickets?.reference}</Link></div>
                  <div className="mt-1 font-medium">{i.tickets?.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{i.profiles?.full_name} · {fmtDateTime(i.started_at)} → {fmtDateTime(i.ended_at)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Pill className="border-border text-foreground">{RESULT_LABEL[i.result] ?? i.result}</Pill>
                  <span className="font-semibold">{fmtMoney(total(i))}</span>
                  {(role === "admin" || i.technician_id === session?.user.id) && <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(i.id)}><Trash2 className="size-4" /></Button>}
                </div>
              </div>
              <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div><div className="eyebrow mb-1">Diagnostic</div><p className="text-muted-foreground">{i.diagnosis}</p></div>
                <div><div className="eyebrow mb-1">Travaux réalisés</div><p className="text-muted-foreground">{i.work_done}</p></div>
              </div>
              {i.intervention_materials?.length > 0 && (
                <div className="mt-4 text-sm"><div className="eyebrow mb-1">Pièces utilisées</div>
                  <ul className="text-muted-foreground">{i.intervention_materials.map((m: any) => <li key={m.id}>{m.quantity} × {m.name} — {fmtMoney(Number(m.unit_cost))}</li>)}</ul>
                </div>
              )}
              {i.remarks && <p className="mt-3 text-xs text-muted-foreground">Remarques : {i.remarks}</p>}
            </div>
          ))}
        </div>
      )}
      <NewIntervention open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewIntervention({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [mats, setMats] = useState<Mat[]>([]);
  const [f, setF] = useState({ ticket_id: "", diagnosis: "", work_done: "", started_at: "", ended_at: "", result: "reussie", labor_cost: "0", remarks: "" });
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", "for-intervention", role],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("tickets").select("id,reference,title,assigned_to").in("status", ["affecte", "en_cours", "en_attente_piece", "resolu"]);
      if (role === "technicien") q = q.eq("assigned_to", session!.user.id);
      return (await q).data ?? [];
    },
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = tickets.find((x) => x.id === f.ticket_id);
    if (!t) return toast.error("Choisissez un ticket");
    if (!f.diagnosis.trim() || !f.work_done.trim()) return toast.error("Diagnostic et travaux sont obligatoires");
    const techId = role === "technicien" ? session!.user.id : t.assigned_to;
    if (!techId) return toast.error("Ce ticket n'a pas de technicien affecté");
    setBusy(true);
    const { data, error } = await supabase.from("interventions").insert({
      ticket_id: t.id, technician_id: techId, diagnosis: f.diagnosis, work_done: f.work_done,
      started_at: f.started_at ? new Date(f.started_at).toISOString() : new Date().toISOString(),
      ended_at: f.ended_at ? new Date(f.ended_at).toISOString() : null,
      result: f.result, labor_cost: Number(f.labor_cost) || 0, remarks: f.remarks || null,
    } as never).select("id").single();
    if (error || !data) { setBusy(false); return toast.error("Enregistrement impossible"); }
    const rows = mats.filter((m) => m.name.trim()).map((m) => ({ ...m, intervention_id: data.id }));
    if (rows.length) await supabase.from("intervention_materials").insert(rows);
    setBusy(false);
    toast.success("Rapport d'intervention enregistré");
    qc.invalidateQueries({ queryKey: ["interventions"] });
    setMats([]); setF({ ticket_id: "", diagnosis: "", work_done: "", started_at: "", ended_at: "", result: "reussie", labor_cost: "0", remarks: "" });
    onOpenChange(false);
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Nouveau rapport d'intervention</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 text-sm">
          <label className="grid gap-1">Ticket<select className={inputCls} value={f.ticket_id} onChange={set("ticket_id")}><option value="">— Sélectionner —</option>{tickets.map((t) => <option key={t.id} value={t.id}>{t.reference} · {t.title}</option>)}</select></label>
          <label className="grid gap-1">Diagnostic<textarea className={inputCls + " h-20 py-2"} value={f.diagnosis} onChange={set("diagnosis")} /></label>
          <label className="grid gap-1">Travaux réalisés<textarea className={inputCls + " h-20 py-2"} value={f.work_done} onChange={set("work_done")} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">Début<input type="datetime-local" className={inputCls} value={f.started_at} onChange={set("started_at")} /></label>
            <label className="grid gap-1">Fin<input type="datetime-local" className={inputCls} value={f.ended_at} onChange={set("ended_at")} /></label>
            <label className="grid gap-1">Résultat<select className={inputCls} value={f.result} onChange={set("result")}>{Object.entries(RESULT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="grid gap-1">Main d'œuvre (€)<input type="number" min="0" step="0.01" className={inputCls} value={f.labor_cost} onChange={set("labor_cost")} /></label>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">Pièces détachées<Button type="button" size="sm" variant="ghost" onClick={() => setMats([...mats, { name: "", quantity: 1, unit_cost: 0 }])}><Plus className="size-3" /> Ajouter</Button></div>
            {mats.map((m, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-[1fr_70px_90px_auto] gap-2">
                <input placeholder="Désignation" className={inputCls} value={m.name} onChange={(e) => setMats(mats.map((x, j) => j === idx ? { ...x, name: e.target.value } : x))} />
                <input type="number" min="1" className={inputCls} value={m.quantity} onChange={(e) => setMats(mats.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                <input type="number" min="0" step="0.01" className={inputCls} value={m.unit_cost} onChange={(e) => setMats(mats.map((x, j) => j === idx ? { ...x, unit_cost: Number(e.target.value) } : x))} />
                <Button type="button" size="icon" variant="ghost" aria-label="Retirer" onClick={() => setMats(mats.filter((_, j) => j !== idx))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <label className="grid gap-1">Remarques<textarea className={inputCls + " h-16 py-2"} value={f.remarks} onChange={set("remarks")} /></label>
          <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le rapport"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

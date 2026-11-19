import { useState, type ReactElement } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TicketStatus } from "@/lib/labels";

type T = { id: string; status: string; requester_id: string; assigned_to: string | null };

export function TicketActions({ t }: { t: T }) {
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<null | "refuse" | "reject">(null);
  const [tech, setTech] = useState("");
  const [busy, setBusy] = useState(false);
  const status = t.status as TicketStatus;

  const { data: techs = [] } = useQuery({
    queryKey: ["techs"], enabled: role === "admin",
    queryFn: async () => {
      const { data: r } = await supabase.from("user_roles").select("user_id").eq("role", "technicien");
      const ids = (r ?? []).map((x) => x.user_id);
      if (!ids.length) return [];
      return (await supabase.from("profiles").select("id,full_name,specialization").in("id", ids)).data ?? [];
    },
  });
  const { data: pending } = useQuery({
    queryKey: ["assignment", t.id, uid], enabled: !!uid && t.assigned_to === uid,
    queryFn: async () => (await supabase.from("ticket_assignments").select("id").eq("ticket_id", t.id).eq("technician_id", uid!).eq("status", "en_attente").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  async function run(fn: () => PromiseLike<{ error: { message: string } | null } | void>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res && res.error) { toast.error(res.error.message); return; }
    toast.success(ok); setMode(null); setReason("");
    qc.invalidateQueries();
  }
  const setStatus = (s: TicketStatus, extra: Record<string, unknown> = {}) => supabase.from("tickets").update({ status: s, ...extra } as never).eq("id", t.id);

  const assign = () => run(async () => {
    if (!tech) return { error: { message: "Choisissez un technicien." } };
    const a = await supabase.from("ticket_assignments").insert({ ticket_id: t.id, technician_id: tech, assigned_by: uid ?? null });
    if (a.error) return a;
    return setStatus("affecte", { assigned_to: tech });
  }, "Ticket affecté.");

  const accept = () => run(async () => {
    if (pending) { const r = await supabase.from("ticket_assignments").update({ status: "acceptee", responded_at: new Date().toISOString() }).eq("id", pending.id); if (r.error) return r; }
    return setStatus("en_cours");
  }, "Affectation acceptée, ticket en cours.");

  const refuse = () => run(async () => {
    if (reason.trim().length < 5) return { error: { message: "Indiquez un motif (5 caractères min.)." } };
    if (pending) { const r = await supabase.from("ticket_assignments").update({ status: "refusee", reason, responded_at: new Date().toISOString() }).eq("id", pending.id); if (r.error) return r; }
    return setStatus("en_attente_affectation");
  }, "Affectation refusée. L'administrateur est prévenu.");

  const reject = () => run(async () => {
    if (reason.trim().length < 5) return { error: { message: "Indiquez un motif (5 caractères min.)." } };
    return setStatus("rejete", { rejection_reason: reason });
  }, "Ticket rejeté.");

  const isTech = t.assigned_to === uid && role !== "admin";
  const isReq = t.requester_id === uid;
  const open = !["resolu", "cloture", "rejete"].includes(status);
  const btns: ReactElement[] = [];

  if (role === "admin" && open) {
    btns.push(
      <div key="as" className="space-y-2">
        <select value={tech} onChange={(e) => setTech(e.target.value)} className="h-9 w-full rounded-md border border-input bg-surface px-3 text-sm">
          <option value="">{t.assigned_to ? "Réaffecter à…" : "Affecter à…"}</option>
          {techs.map((x) => <option key={x.id} value={x.id}>{x.full_name}{x.specialization ? ` — ${x.specialization}` : ""}</option>)}
        </select>
        <Button size="sm" className="w-full" disabled={busy} onClick={assign}>Affecter</Button>
      </div>,
      <Button key="rj" size="sm" variant="outline" className="w-full" onClick={() => setMode("reject")}>Rejeter le ticket</Button>,
    );
  }
  if (isTech) {
    if (status === "affecte") {
      btns.push(<Button key="ac" size="sm" className="w-full" disabled={busy} onClick={accept}>Accepter l'affectation</Button>,
        <Button key="rf" size="sm" variant="outline" className="w-full" onClick={() => setMode("refuse")}>Refuser avec motif</Button>);
    }
    if (status === "en_cours") btns.push(<Button key="pc" size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => run(() => setStatus("en_attente_piece"), "En attente de pièce.")}>En attente de pièce</Button>);
    if (status === "en_attente_piece") btns.push(<Button key="rp" size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => run(() => setStatus("en_cours"), "Reprise du traitement.")}>Reprendre le traitement</Button>);
    if (status === "en_cours" || status === "en_attente_piece") btns.push(<Button key="rs" size="sm" className="w-full" disabled={busy} onClick={() => run(() => setStatus("resolu"), "Ticket marqué résolu.")}>Marquer comme résolu</Button>);
  }
  if (isReq && status === "resolu") {
    btns.push(<Button key="cl" size="sm" className="w-full" disabled={busy} onClick={() => run(() => setStatus("cloture"), "Ticket clôturé. Merci !")}>Confirmer et clôturer</Button>,
      <Button key="ro" size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => run(() => setStatus("en_cours"), "Ticket rouvert.")}>Le problème persiste — rouvrir</Button>);
  }

  if (mode) {
    return (
      <div className="space-y-2">
        <div className="eyebrow">{mode === "refuse" ? "Motif du refus" : "Motif du rejet"}</div>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez brièvement…" />
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={busy} onClick={mode === "refuse" ? refuse : reject}>Confirmer</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Annuler</Button>
        </div>
      </div>
    );
  }
  if (!btns.length) return <p className="text-xs text-muted-foreground">Aucune action disponible pour vous à ce stade.</p>;
  return <div className="space-y-2">{btns}</div>;
}

export function TicketComments({ ticketId }: { ticketId: string }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["comments", ticketId],
    queryFn: async () => (await supabase.from("ticket_comments").select("id,body,created_at,author:profiles(full_name)").eq("ticket_id", ticketId).order("created_at")).data ?? [],
  });
  async function send() {
    if (!body.trim() || !session) return;
    const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, author_id: session.user.id, body: body.trim() });
    if (error) { toast.error("Envoi impossible."); return; }
    setBody(""); qc.invalidateQueries();
  }
  return (
    <div>
      <ul className="space-y-3">
        {data.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 text-xs text-muted-foreground">{(c.author as { full_name: string } | null)?.full_name ?? "—"} · {new Date(c.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            {c.body}
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-muted-foreground">Aucun commentaire.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ajouter un commentaire…" />
        <Button onClick={send} className="self-end">Envoyer</Button>
      </div>
    </div>
  );
}

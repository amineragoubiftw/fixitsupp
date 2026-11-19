import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABEL, PRIORITY_LABEL, type Category, type Priority } from "@/lib/labels";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/tickets/nouveau")({
  head: () => ({ meta: [{ title: "Nouveau ticket — FixIT" }, { name: "description", content: "Déclarer une panne ou une demande au service informatique." }, { property: "og:title", content: "Nouveau ticket — FixIT" }, { property: "og:description", content: "Déclarer une panne ou une demande au service informatique." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewTicket,
});

const sel = "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm";
function NewTicket() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ title: "", description: "", category: "materiel" as Category, priority: "moyenne" as Priority });
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return undefined;
    setBusy(true);
    const { data, error } = await supabase.from("tickets").insert({ ...f, requester_id: session.user.id } as never).select("id").single();
    setBusy(false);
    if (error) { toast.error("Création impossible : " + error.message); return; }
    toast.success("Ticket créé.");
    navigate({ to: "/tickets/$id", params: { id: (data as { id: string }).id } });
  }
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Support" title="Nouveau ticket" desc="Décrivez le problème le plus précisément possible." />
      <form onSubmit={submit} className="surface-card space-y-4 p-6">
        <div className="space-y-1.5"><Label>Titre</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex. : Vidéoprojecteur salle B12 sans signal" /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea required rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Catégorie</Label><select className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Priorité</Label><select className={sel} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Priority })}>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <Button type="submit" disabled={busy}>Envoyer la demande</Button>
      </form>
    </div>
  );
}

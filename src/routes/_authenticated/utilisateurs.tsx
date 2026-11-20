import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Empty } from "@/components/app/ui-bits";
import { ROLE_LABEL, fmtDate, type Role } from "@/lib/labels";
import { createAccount, deleteAccount, setRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — FixIT" }, { name: "description", content: "Gestion des comptes, rôles et accès." }, { property: "og:title", content: "Utilisateurs — FixIT" }, { property: "og:description", content: "Gestion des comptes, rôles et accès." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const inputCls = "h-9 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring";

function Page() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const del = useServerFn(deleteAccount);
  const updRole = useServerFn(setRole);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["users"], enabled: role === "admin",
    queryFn: async () => {
      const [{ data: p }, { data: r }, { data: d }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,department_id,specialization,created_at").order("full_name"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("departments").select("id,name").order("name"),
      ]);
      return { users: p ?? [], roles: r ?? [], depts: d ?? [] };
    },
  });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  if (role !== "admin") return <Empty title="Accès réservé" desc="Cette page est réservée aux administrateurs." />;
  const roleOf = (id: string): Role => { const rs = (data?.roles ?? []).filter((r) => r.user_id === id).map((r) => r.role); return rs.includes("admin") ? "admin" : rs.includes("technicien") ? "technicien" : "demandeur"; };
  const users = (data?.users ?? []).filter((u) => !q || `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["technicians"] }); };

  async function changeRole(id: string, r: Role) {
    try { await updRole({ data: { id, role: r } }); toast.success("Rôle mis à jour"); refresh(); } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Supprimer le compte de ${name} ?`)) return;
    try { await del({ data: { id } }); toast.success("Compte supprimé"); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div ref={ref}>
      <PageHeader eyebrow="Administration" title="Utilisateurs" desc="Comptes, rôles et services de rattachement."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nouvel utilisateur</Button>} />
      <div data-reveal className="mb-4"><input placeholder="Rechercher un nom ou un e-mail…" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls + " max-w-xs"} /></div>
      {users.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucun utilisateur"} /> : (
        <div data-reveal className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Nom</th><th className="px-4 py-3 font-medium">E-mail</th><th className="px-4 py-3 font-medium">Service</th><th className="px-4 py-3 font-medium">Rôle</th><th className="px-4 py-3 font-medium">Créé le</th><th />
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">{u.full_name}{u.specialization && <div className="text-xs text-muted-foreground">{u.specialization}</div>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{data?.depts.find((d) => d.id === u.department_id)?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select aria-label="Rôle" disabled={u.id === session?.user.id} value={roleOf(u.id)} onChange={(e) => changeRole(u.id, e.target.value as Role)} className="h-8 rounded-md border border-input bg-surface px-2 text-xs">
                      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">{u.id !== session?.user.id && <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(u.id, u.full_name)}><Trash2 className="size-4" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <NewUser open={open} onOpenChange={setOpen} depts={data?.depts ?? []} onDone={refresh} />
    </div>
  );
}

function NewUser({ open, onOpenChange, depts, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; depts: { id: string; name: string }[]; onDone: () => void }) {
  const create = useServerFn(createAccount);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "demandeur" as Role, specialization: "", department_id: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: { full_name: f.full_name, email: f.email, password: f.password, role: f.role, department_id: f.department_id || null, ...(f.specialization ? { specialization: f.specialization } : {}) } });
      toast.success("Compte créé");
      setF({ full_name: "", email: "", password: "", role: "demandeur", specialization: "", department_id: "" });
      onDone(); onOpenChange(false);
    } catch (err) { toast.error((err as Error).message || "Création impossible"); }
    setBusy(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3 text-sm">
          <label className="grid gap-1">Nom complet<input required minLength={2} className={inputCls} value={f.full_name} onChange={set("full_name")} /></label>
          <label className="grid gap-1">E-mail<input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></label>
          <label className="grid gap-1">Mot de passe provisoire<input required minLength={8} type="password" className={inputCls} value={f.password} onChange={set("password")} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">Rôle<select className={inputCls} value={f.role} onChange={set("role")}>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
            <label className="grid gap-1">Service<select className={inputCls} value={f.department_id} onChange={set("department_id")}><option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          </div>
          {f.role === "technicien" && <label className="grid gap-1">Spécialité<input className={inputCls} value={f.specialization} onChange={set("specialization")} /></label>}
          <Button type="submit" disabled={busy}>{busy ? "Création…" : "Créer le compte"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

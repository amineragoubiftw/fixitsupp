import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/ui-bits";
import { ROLE_LABEL } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({ meta: [{ title: "Mon profil — FixIT" }, { name: "description", content: "Vos informations personnelles et votre mot de passe." }, { property: "og:title", content: "Mon profil — FixIT" }, { property: "og:description", content: "Vos informations personnelles et votre mot de passe." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

const inputCls = "h-9 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring";

function Page() {
  const { profile, role, refresh } = useAuth();
  const ref = useReveal<HTMLDivElement>([!!profile]);
  const { data: depts = [] } = useQuery({ queryKey: ["departments"], queryFn: async () => (await supabase.from("departments").select("id,name").order("name")).data ?? [] });
  const [f, setF] = useState({ full_name: "", phone: "", department_id: "", specialization: "", available: true });
  const [pw, setPw] = useState({ a: "", b: "" });
  useEffect(() => { if (profile) setF({ full_name: profile.full_name, phone: profile.phone ?? "", department_id: profile.department_id ?? "", specialization: profile.specialization ?? "", available: profile.available }); }, [profile]);
  if (!profile) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.full_name.trim().length < 2) { toast.error("Le nom est trop court"); return; }
    const { error } = await supabase.from("profiles").update({ full_name: f.full_name.trim(), phone: f.phone || null, department_id: f.department_id || null, specialization: f.specialization || null, available: f.available }).eq("id", profile!.id);
    if (error) { toast.error("Enregistrement impossible"); return; }
    toast.success("Profil mis à jour"); refresh();
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.a.length < 8) { toast.error("8 caractères minimum"); return; }
    if (pw.a !== pw.b) { toast.error("Les mots de passe ne correspondent pas"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    if (error) { toast.error("Changement impossible"); return; }
    toast.success("Mot de passe modifié"); setPw({ a: "", b: "" });
  }

  return (
    <div ref={ref}>
      <PageHeader eyebrow={role ? ROLE_LABEL[role] : "Compte"} title="Mon profil" desc={profile.email} />
      <div className="grid gap-4 lg:grid-cols-2">
        <form data-reveal onSubmit={save} className="surface-card grid gap-3 p-5 text-sm">
          <div className="eyebrow">Informations</div>
          <label className="grid gap-1">Nom complet<input className={inputCls} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
          <label className="grid gap-1">Téléphone<input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="grid gap-1">Service<select className={inputCls} value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}><option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          {role === "technicien" && <>
            <label className="grid gap-1">Spécialité<input className={inputCls} value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} /></label>
            <label className="flex items-center justify-between">Disponible pour de nouveaux tickets<Switch checked={f.available} onCheckedChange={(v) => setF({ ...f, available: v })} /></label>
          </>}
          <Button type="submit">Enregistrer</Button>
        </form>
        <form data-reveal onSubmit={changePw} className="surface-card grid content-start gap-3 p-5 text-sm">
          <div className="eyebrow">Mot de passe</div>
          <label className="grid gap-1">Nouveau mot de passe<input type="password" className={inputCls} value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></label>
          <label className="grid gap-1">Confirmation<input type="password" className={inputCls} value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></label>
          <Button type="submit" variant="outline">Changer le mot de passe</Button>
        </form>
      </div>
    </div>
  );
}

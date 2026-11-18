import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nouveau mot de passe — FixIT" }, { name: "description", content: "Choisissez un nouveau mot de passe FixIT." }, { property: "og:title", content: "Nouveau mot de passe — FixIT" }, { property: "og:description", content: "Réinitialisation du mot de passe FixIT." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("8 caractères minimum.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error("Lien expiré ou invalide."); else { toast.success("Mot de passe mis à jour."); navigate({ to: "/tableau-de-bord" }); }
  }
  return (
    <div className="grid min-h-screen place-items-center halo-bg px-6">
      <form onSubmit={save} className="surface-card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
        <div className="space-y-1.5"><Label htmlFor="pw">Mot de passe</Label><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" className="w-full">Enregistrer</Button>
      </form>
    </div>
  );
}

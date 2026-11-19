import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Wrench, ShieldCheck, UserCog, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { ensureDemoData } from "@/lib/demo.functions";
import { ROLE_LABEL, type Role } from "@/lib/labels";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — FixIT" },
      { name: "description", content: "Connectez-vous à FixIT ou essayez un compte de démonstration." },
      { property: "og:title", content: "Connexion — FixIT" },
      { property: "og:description", content: "Accès à l'espace support et maintenance FixIT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const ROLE_ICON: Record<Role, typeof User> = { admin: ShieldCheck, technicien: UserCog, demandeur: User };

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const seed = useServerFn(ensureDemoData);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const ref = useReveal<HTMLDivElement>();

  useEffect(() => { if (session) navigate({ to: "/tableau-de-bord", replace: true }); }, [session, navigate]);

  async function login(e: string, p: string, key: string) {
    setBusy(key);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    setBusy(null);
    if (error) toast.error("Identifiants incorrects ou compte inexistant.");
    else navigate({ to: "/tableau-de-bord" });
  }
  async function demo(e: string) {
    setBusy(e);
    try { await seed(); } catch { /* données déjà prêtes */ }
    await login(e, DEMO_PASSWORD, e);
  }
  async function reset() {
    if (!email) { toast.error("Saisissez votre adresse e-mail."); return; }
    setBusy("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(null);
    if (error) toast.error("Envoi impossible pour le moment.");
    else { toast.success("Un lien de réinitialisation vous a été envoyé."); setForgot(false); }
  }

  return (
    <div ref={ref} className="relative grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="pointer-events-none absolute inset-0 halo-bg" />
      <section className="relative flex flex-col justify-center px-6 py-12 md:px-16">
        <div data-reveal className="mb-10 flex items-center gap-2.5 text-lg font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary/20 glow"><Wrench className="size-4 text-cyan" /></span>FixIT</div>
        <h1 data-reveal className="text-3xl font-semibold tracking-tight">{forgot ? "Mot de passe oublié" : "Connexion"}</h1>
        <p data-reveal className="mt-2 text-sm text-muted-foreground">{forgot ? "Recevez un lien pour choisir un nouveau mot de passe." : "Accédez à votre espace support."}</p>
        <form data-reveal className="mt-8 max-w-sm space-y-4" onSubmit={(e) => { e.preventDefault(); forgot ? reset() : login(email, password, "form"); }}>
          <div className="space-y-1.5"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@etablissement.fr" /></div>
          {!forgot && <div className="space-y-1.5"><Label htmlFor="pw">Mot de passe</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
          <Button type="submit" className="w-full" disabled={!!busy}>{(busy === "form" || busy === "reset") && <Loader2 className="size-4 animate-spin" />}{forgot ? "Envoyer le lien" : "Se connecter"}</Button>
          <button type="button" onClick={() => setForgot(!forgot)} className="text-xs text-muted-foreground hover:text-foreground">{forgot ? "← Retour à la connexion" : "Mot de passe oublié ?"}</button>
        </form>
      </section>
      <section className="relative border-l border-border bg-surface/50 px-6 py-12 md:px-12">
        <div data-reveal className="eyebrow mb-2">Accès rapide — démonstration</div>
        <h2 data-reveal className="text-xl font-semibold">Choisissez un rôle à tester</h2>
        <p data-reveal className="mt-1 text-sm text-muted-foreground">Un clic suffit : chaque compte voit l'application selon ses droits.</p>
        <div className="mt-6 space-y-6">
          {(["admin", "technicien", "demandeur"] as Role[]).map((r) => {
            const Icon = ROLE_ICON[r];
            return (
              <div key={r} data-reveal>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-cyan" />{ROLE_LABEL[r]}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.filter((a) => a.role === r).map((a) => (
                    <button key={a.email} onClick={() => demo(a.email)} disabled={!!busy}
                      className="surface-card flex items-center gap-3 p-3 text-left transition-all hover:-translate-y-0.5 hover:glow disabled:opacity-60">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-cyan">{a.name.split(" ").map((x) => x[0]).join("")}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.name}</span><span className="block truncate text-xs text-muted-foreground">{a.title}</span></span>
                      {busy === a.email && <Loader2 className="size-4 animate-spin text-cyan" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

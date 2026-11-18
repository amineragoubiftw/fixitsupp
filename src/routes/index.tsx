import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Ticket, Wrench, Monitor, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/lib/anim";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FixIT — Support & maintenance informatique" },
      { name: "description", content: "Déclarez une panne, suivez vos tickets et pilotez les interventions du parc informatique." },
      { property: "og:title", content: "FixIT — Support & maintenance informatique" },
      { property: "og:description", content: "Tickets, interventions et parc informatique réunis en un seul outil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Ticket, t: "Tickets", d: "Déclaration en 30 secondes, suivi en temps réel des 8 statuts." },
  { icon: Wrench, t: "Interventions", d: "Affectation, acceptation ou refus motivé, compte rendu technique." },
  { icon: Monitor, t: "Parc informatique", d: "Inventaire des équipements par salle, état et historique des pannes." },
  { icon: Bell, t: "Notifications", d: "Chaque changement est tracé et notifié aux bonnes personnes." },
];

function Landing() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-lines" />
      <div className="pointer-events-none absolute inset-0 halo-bg" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5 text-lg font-semibold"><span className="grid size-8 place-items-center rounded-lg bg-primary/20 glow"><Wrench className="size-4 text-cyan" /></span>Fix<span className="-ml-2.5 text-cyan">IT</span></span>
        <Button asChild variant="outline" size="sm"><Link to="/auth">Se connecter</Link></Button>
      </header>
      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-28">
        <div data-reveal className="eyebrow mb-5 flex items-center gap-2"><ShieldCheck className="size-3.5 text-cyan" /> Service informatique — ITSM</div>
        <h1 data-reveal className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Le support informatique, <span className="text-gradient">enfin sous contrôle.</span>
        </h1>
        <p data-reveal className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          Déclarez une panne, suivez son traitement et pilotez toute la maintenance de votre établissement depuis un seul espace.
        </p>
        <div data-reveal className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="glow"><Link to="/auth">Accéder à FixIT <ArrowRight className="size-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Essayer un compte de démo</Link></Button>
        </div>
        <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} data-reveal className="surface-card p-5 transition-transform hover:-translate-y-0.5">
              <f.icon className="size-5 text-cyan" />
              <h3 className="mt-4 font-medium">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

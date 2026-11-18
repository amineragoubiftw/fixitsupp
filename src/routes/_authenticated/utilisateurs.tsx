import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/lib/anim";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({ meta: [{ title: "Utilisateurs — FixIT" }, { name: "description", content: "Gestion des comptes et des rôles." }, { property: "og:title", content: "Utilisateurs — FixIT" }, { property: "og:description", content: "Gestion des comptes et des rôles." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <PageHeader eyebrow="FixIT" title="Utilisateurs" desc="Gestion des comptes et des rôles." />
      <div data-reveal><Empty title="Module en préparation" desc="Cet écran sera complété à l'étape suivante." /></div>
    </div>
  );
}

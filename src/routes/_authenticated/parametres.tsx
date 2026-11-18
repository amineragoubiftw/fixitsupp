import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/lib/anim";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — FixIT" }, { name: "description", content: "Préférences de l'application." }, { property: "og:title", content: "Paramètres — FixIT" }, { property: "og:description", content: "Préférences de l'application." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <PageHeader eyebrow="FixIT" title="Paramètres" desc="Préférences de l'application." />
      <div data-reveal><Empty title="Module en préparation" desc="Cet écran sera complété à l'étape suivante." /></div>
    </div>
  );
}

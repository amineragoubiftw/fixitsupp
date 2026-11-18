import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/lib/anim";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/interventions")({
  head: () => ({ meta: [{ title: "Interventions — FixIT" }, { name: "description", content: "Suivi des interventions techniques et comptes rendus." }, { property: "og:title", content: "Interventions — FixIT" }, { property: "og:description", content: "Suivi des interventions techniques et comptes rendus." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <PageHeader eyebrow="FixIT" title="Interventions" desc="Suivi des interventions techniques et comptes rendus." />
      <div data-reveal><Empty title="Module en préparation" desc="Cet écran sera complété à l'étape suivante." /></div>
    </div>
  );
}

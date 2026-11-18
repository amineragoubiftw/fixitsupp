import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/lib/anim";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/techniciens")({
  head: () => ({ meta: [{ title: "Techniciens — FixIT" }, { name: "description", content: "Charge de travail et disponibilité de l'équipe technique." }, { property: "og:title", content: "Techniciens — FixIT" }, { property: "og:description", content: "Charge de travail et disponibilité de l'équipe technique." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <PageHeader eyebrow="FixIT" title="Techniciens" desc="Charge de travail et disponibilité de l'équipe technique." />
      <div data-reveal><Empty title="Module en préparation" desc="Cet écran sera complété à l'étape suivante." /></div>
    </div>
  );
}

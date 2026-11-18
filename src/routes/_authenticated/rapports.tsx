import { createFileRoute } from "@tanstack/react-router";
import { useReveal } from "@/lib/anim";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({ meta: [{ title: "Rapports — FixIT" }, { name: "description", content: "Statistiques et exports CSV / PDF." }, { property: "og:title", content: "Rapports — FixIT" }, { property: "og:description", content: "Statistiques et exports CSV / PDF." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref}>
      <PageHeader eyebrow="FixIT" title="Rapports" desc="Statistiques et exports CSV / PDF." />
      <div data-reveal><Empty title="Module en préparation" desc="Cet écran sera complété à l'étape suivante." /></div>
    </div>
  );
}

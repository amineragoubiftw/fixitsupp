import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useReveal } from "@/lib/anim";
import { fmtDateTime } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { PageHeader, Empty } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FixIT" }, { name: "description", content: "Vos alertes et mises à jour de tickets." }, { property: "og:title", content: "Notifications — FixIT" }, { property: "og:description", content: "Vos alertes et mises à jour de tickets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Notifs,
});

function Notifs() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const { data = [], isLoading } = useQuery({ queryKey: ["notifs", uid], enabled: !!uid, queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", uid!).order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const ref = useReveal<HTMLDivElement>([isLoading]);
  async function readAll() { await supabase.from("notifications").update({ read: true }).eq("user_id", uid!).eq("read", false); qc.invalidateQueries(); }
  return (
    <div ref={ref}>
      <PageHeader eyebrow="Centre d'alertes" title="Notifications" actions={<Button variant="outline" size="sm" onClick={readAll}>Tout marquer comme lu</Button>} />
      {data.length === 0 ? <Empty title={isLoading ? "Chargement…" : "Aucune notification"} /> : (
        <ul className="surface-card divide-y divide-border">
          {data.map((n) => (
            <li key={n.id} data-reveal className="flex gap-3 px-5 py-4">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-muted" : "bg-cyan"}`} />
              <div className="flex-1"><div className="text-sm font-medium">{n.title}</div>{n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}</div>
              <span className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL, PRIORITY_DOT, type TicketStatus, type Priority } from "@/lib/labels";

export function PageHeader({ eyebrow, title, desc, actions }: { eyebrow?: string; title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div data-reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {desc && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>{children}</span>;
}
export const StatusPill = ({ s }: { s: TicketStatus }) => <Pill className={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Pill>;
export const PriorityTag = ({ p }: { p: Priority }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("size-1.5 rounded-full", PRIORITY_DOT[p])} />{PRIORITY_LABEL[p]}</span>
);
export function Empty({ title, desc }: { title: string; desc?: string }) {
  return <div className="surface-card grid place-items-center px-6 py-16 text-center"><p className="font-medium">{title}</p>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>;
}

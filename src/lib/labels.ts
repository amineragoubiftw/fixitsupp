export type Role = "admin" | "technicien" | "demandeur";
export type TicketStatus = "nouveau" | "en_attente_affectation" | "affecte" | "en_cours" | "en_attente_piece" | "resolu" | "cloture" | "rejete";
export type Priority = "basse" | "moyenne" | "haute" | "critique";
export type Category = "materiel" | "logiciel" | "reseau" | "imprimante" | "systeme" | "securite" | "autre";
export type EquipmentStatus = "operationnel" | "en_panne" | "en_maintenance" | "hors_service";

export const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", technicien: "Technicien", demandeur: "Demandeur" };

export const STATUS_LABEL: Record<TicketStatus, string> = {
  nouveau: "Nouveau", en_attente_affectation: "En attente d'affectation", affecte: "Affecté", en_cours: "En cours",
  en_attente_piece: "En attente de pièce", resolu: "Résolu", cloture: "Clôturé", rejete: "Rejeté",
};
export const STATUS_TONE: Record<TicketStatus, string> = {
  nouveau: "text-cyan bg-cyan/10 border-cyan/30",
  en_attente_affectation: "text-warning bg-warning/10 border-warning/30",
  affecte: "text-violet bg-violet/10 border-violet/30",
  en_cours: "text-primary bg-primary/15 border-primary/40",
  en_attente_piece: "text-warning bg-warning/10 border-warning/30",
  resolu: "text-success bg-success/10 border-success/30",
  cloture: "text-muted-foreground bg-muted border-border",
  rejete: "text-danger bg-danger/10 border-danger/30",
};
export const PRIORITY_LABEL: Record<Priority, string> = { basse: "Basse", moyenne: "Moyenne", haute: "Haute", critique: "Critique" };
export const PRIORITY_TONE: Record<Priority, string> = {
  basse: "text-muted-foreground", moyenne: "text-info", haute: "text-warning", critique: "text-danger",
};
export const PRIORITY_DOT: Record<Priority, string> = { basse: "bg-muted-foreground", moyenne: "bg-info", haute: "bg-warning", critique: "bg-danger" };
export const CATEGORY_LABEL: Record<Category, string> = {
  materiel: "Matériel", logiciel: "Logiciel", reseau: "Réseau", imprimante: "Imprimante", systeme: "Système d'exploitation", securite: "Sécurité", autre: "Autre",
};
export const EQ_STATUS_LABEL: Record<EquipmentStatus, string> = {
  operationnel: "Opérationnel", en_panne: "En panne", en_maintenance: "En maintenance", hors_service: "Hors service",
};
export const EQ_STATUS_TONE: Record<EquipmentStatus, string> = {
  operationnel: "text-success bg-success/10 border-success/30",
  en_panne: "text-danger bg-danger/10 border-danger/30",
  en_maintenance: "text-warning bg-warning/10 border-warning/30",
  hors_service: "text-muted-foreground bg-muted border-border",
};
export const RESULT_LABEL: Record<string, string> = { en_cours: "En cours", reussie: "Réussie", partielle: "Partielle", echec: "Échec" };

export const OPEN_STATUSES: TicketStatus[] = ["nouveau", "en_attente_affectation", "affecte", "en_cours", "en_attente_piece"];

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const fmtHours = (h: number | null | undefined) => (h == null || isNaN(h) ? "—" : h < 24 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} j`);
export const fmtMoney = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export const relTime = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
};

/** Mean time to resolve, in hours, over tickets that have resolved_at. */
export function mttrHours(tickets: { created_at: string; resolved_at: string | null }[]): number | null {
  const done = tickets.filter((t) => t.resolved_at);
  if (!done.length) return null;
  const sum = done.reduce((a, t) => a + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0);
  return sum / done.length / 3_600_000;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n");
}
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["\ufeff" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

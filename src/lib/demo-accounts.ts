import type { Role } from "./labels";
export const DEMO_PASSWORD = "FixIT-Demo-2026!";
export const DEMO_ACCOUNTS: { email: string; name: string; role: Role; title: string; spec?: string; dept: string }[] = [
  { email: "admin@fixit.demo", name: "Nadia Haddad", role: "admin", title: "Responsable DSI", dept: "Informatique" },
  { email: "karim.benali@fixit.demo", name: "Karim Benali", role: "technicien", title: "Technicien réseau", spec: "Réseau & sécurité", dept: "Informatique" },
  { email: "sophie.martin@fixit.demo", name: "Sophie Martin", role: "technicien", title: "Technicienne poste de travail", spec: "Matériel & imprimantes", dept: "Informatique" },
  { email: "yassine.amrani@fixit.demo", name: "Yassine Amrani", role: "technicien", title: "Technicien systèmes", spec: "Systèmes & serveurs", dept: "Informatique" },
  { email: "claire.dubois@fixit.demo", name: "Claire Dubois", role: "demandeur", title: "Enseignante — Mathématiques", dept: "Mathématiques" },
  { email: "marc.lefevre@fixit.demo", name: "Marc Lefèvre", role: "demandeur", title: "Personnel — Scolarité", dept: "Scolarité" },
];

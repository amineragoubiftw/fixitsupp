import { createServerFn } from "@tanstack/react-start";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo-accounts";

/**
 * Idempotently provisions the fixed demo accounts and demo tickets.
 * Public on purpose: it only ever creates the documented demo accounts.
 */
export const ensureDemoData = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await db.from("profiles").select("id,email").eq("is_demo", true);
  const byEmail = new Map((existing ?? []).map((p) => [p.email, p.id]));
  if (byEmail.size >= DEMO_ACCOUNTS.length) return { created: false };

  const { data: depts } = await db.from("departments").select("id,name");
  const deptId = (n: string) => depts?.find((d) => d.name === n)?.id ?? null;

  for (const acc of DEMO_ACCOUNTS) {
    if (byEmail.has(acc.email)) continue;
    let id: string | undefined;
    const { data, error } = await db.auth.admin.createUser({
      email: acc.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name: acc.name },
    });
    if (error) {
      const { data: list } = await db.auth.admin.listUsers({ perPage: 200 });
      id = list?.users.find((u) => u.email === acc.email)?.id;
    } else id = data.user?.id;
    if (!id) continue;
    await db.from("profiles").upsert({ id, email: acc.email, full_name: acc.name, is_demo: true, department_id: deptId(acc.dept), specialization: acc.spec ?? acc.title, available: true });
    await db.from("user_roles").delete().eq("user_id", id);
    await db.from("user_roles").insert({ user_id: id, role: acc.role });
    byEmail.set(acc.email, id);
  }

  const { count } = await db.from("tickets").select("id", { count: "exact", head: true }).eq("is_demo", true);
  if ((count ?? 0) > 0) return { created: true };

  const U = (e: string) => byEmail.get(e)!;
  const admin = U("admin@fixit.demo"), karim = U("karim.benali@fixit.demo"), sophie = U("sophie.martin@fixit.demo"), yassine = U("yassine.amrani@fixit.demo");
  const claire = U("claire.dubois@fixit.demo"), marc = U("marc.lefevre@fixit.demo");
  const { data: eq } = await db.from("equipment").select("id,serial_number,room_id");
  const E = (sn: string) => eq?.find((e) => e.serial_number === sn);
  const day = 86_400_000, now = Date.now();
  const at = (daysAgo: number, h = 0) => new Date(now - daysAgo * day + h * 3_600_000).toISOString();

  type Seed = { t: string; d: string; c: string; p: string; s: string; sn?: string; req: string; tech?: string; ago: number; resH?: number; diag?: string; work?: string; mats?: [string, number, number][]; cost?: number; reason?: string };
  const seeds: Seed[] = [
    { t: "Le PC du labo 1 ne démarre plus", d: "Écran noir au démarrage, voyant d'alimentation orange.", c: "materiel", p: "haute", s: "en_cours", sn: "DL7090-A02", req: claire, tech: sophie, ago: 2 },
    { t: "Imprimante de la scolarité bloquée", d: "Bourrage papier récurrent, message 'Erreur 13.B2'.", c: "imprimante", p: "haute", s: "en_attente_piece", sn: "HPM507-SC1", req: marc, tech: sophie, ago: 4 },
    { t: "Vidéoprojecteur amphi A : image floue", d: "L'image reste floue malgré le réglage de mise au point.", c: "materiel", p: "moyenne", s: "affecte", sn: "EPL610-AMA", req: claire, tech: yassine, ago: 1 },
    { t: "Wi-Fi très lent au bâtiment C", d: "Débit inférieur à 1 Mb/s dans l'amphi C depuis ce matin.", c: "reseau", p: "critique", s: "nouveau", sn: "UBU6-AMC", req: claire, ago: 0.2 },
    { t: "Accès refusé à l'ENT", d: "Message 'session expirée' en boucle pour toute la section.", c: "logiciel", p: "haute", s: "en_attente_affectation", sn: "PER740-ENT", req: marc, ago: 0.5 },
    { t: "Mise à jour Windows en échec", d: "La mise à jour KB5034441 échoue avec le code 0x80070643.", c: "systeme", p: "moyenne", s: "resolu", sn: "LNM70-BIB1", req: marc, tech: yassine, ago: 6, resH: 20, diag: "Partition de récupération trop petite.", work: "Redimensionnement de la partition WinRE puis réinstallation de la mise à jour.", cost: 30 },
    { t: "Courriel suspect reçu par le département", d: "Plusieurs collègues ont reçu un faux lien de réinitialisation de mot de passe.", c: "securite", p: "critique", s: "cloture", req: claire, tech: karim, ago: 12, resH: 3, diag: "Campagne d'hameçonnage ciblée.", work: "Blocage du domaine expéditeur, purge des boîtes, note d'information.", cost: 60 },
    { t: "Switch bâtiment A redémarre seul", d: "Coupures réseau de 2 minutes plusieurs fois par jour.", c: "reseau", p: "haute", s: "cloture", sn: "CS2960-A", req: marc, tech: karim, ago: 25, resH: 30, diag: "Alimentation défaillante.", work: "Remplacement du bloc d'alimentation.", mats: [["Bloc d'alimentation PWR-C2", 1, 189]], cost: 80 },
    { t: "Toner épuisé salle des profs", d: "Plus de toner noir, impression impossible.", c: "imprimante", p: "basse", s: "cloture", sn: "CAN2630-SP", req: claire, tech: sophie, ago: 33, resH: 6, diag: "Consommable vide.", work: "Remplacement du toner.", mats: [["Toner C-EXV33", 1, 64]], cost: 15 },
    { t: "Portable de prêt : clavier défectueux", d: "Plusieurs touches ne répondent plus.", c: "materiel", p: "moyenne", s: "en_cours", sn: "HP450-P04", req: marc, tech: sophie, ago: 3 },
    { t: "Installation de GeoGebra demandée", d: "Logiciel nécessaire pour les TD de la semaine prochaine.", c: "logiciel", p: "basse", s: "resolu", sn: "HP800-A03", req: claire, tech: yassine, ago: 8, resH: 26, diag: "Logiciel absent de l'image.", work: "Déploiement via le gestionnaire de paquets.", cost: 20 },
    { t: "Serveur de fichiers : disque en alerte", d: "Alerte SMART sur le disque 3 de la grappe.", c: "materiel", p: "critique", s: "cloture", sn: "DL380-FS1", req: marc, tech: yassine, ago: 48, resH: 9, diag: "Secteurs réalloués en hausse.", work: "Remplacement à chaud et reconstruction RAID.", mats: [["Disque SAS 1,2 To", 1, 245]], cost: 120 },
    { t: "Vidéoprojecteur salle 201 : lampe grillée", d: "Le projecteur s'éteint au bout de 5 minutes.", c: "materiel", p: "moyenne", s: "rejete", sn: "BQ560-B201", req: claire, ago: 40, reason: "Équipement hors service, remplacement prévu au budget." },
    { t: "Impression lente depuis la mise à jour", d: "Chaque impression met plus de 3 minutes.", c: "imprimante", p: "moyenne", s: "cloture", sn: "HPM507-SC1", req: marc, tech: sophie, ago: 62, resH: 40, diag: "Pilote incompatible.", work: "Réinstallation du pilote universel PCL6.", cost: 25 },
    { t: "Coupure Internet générale", d: "Plus aucun accès Internet dans l'établissement.", c: "reseau", p: "critique", s: "cloture", sn: "CSISR-001", req: claire, tech: karim, ago: 75, resH: 2, diag: "Panne opérateur + bascule non configurée.", work: "Configuration de la liaison de secours 4G.", mats: [["Routeur 4G de secours", 1, 320]], cost: 90 },
    { t: "Écran qui scintille", d: "L'écran du poste d'accueil scintille en permanence.", c: "materiel", p: "basse", s: "cloture", sn: "LNM70-BIB1", req: marc, tech: sophie, ago: 95, resH: 50, diag: "Câble HDMI endommagé.", work: "Remplacement du câble.", mats: [["Câble HDMI 2 m", 1, 12]], cost: 10 },
    { t: "Licence Office expirée", d: "Office passe en mode lecture seule.", c: "logiciel", p: "moyenne", s: "cloture", sn: "LNT14-ADM1", req: marc, tech: yassine, ago: 110, resH: 4, diag: "Licence non réaffectée.", work: "Réattribution de la licence dans la console.", cost: 10 },
    { t: "PC labo : virus détecté", d: "L'antivirus signale un cheval de Troie.", c: "securite", p: "haute", s: "cloture", sn: "DL7090-A01", req: claire, tech: karim, ago: 130, resH: 12, diag: "Clé USB infectée.", work: "Nettoyage complet et durcissement des ports USB.", cost: 45 },
    { t: "Le PC du labo 1 ne démarre plus (bis)", d: "Même symptôme que le mois dernier.", c: "materiel", p: "haute", s: "cloture", sn: "DL7090-A02", req: claire, tech: sophie, ago: 150, resH: 28, diag: "Barrette mémoire défaillante.", work: "Remplacement de la RAM.", mats: [["Barrette DDR4 8 Go", 1, 39]], cost: 30 },
    { t: "Demande de câble réseau", d: "Il manque une prise réseau en salle 102.", c: "reseau", p: "basse", s: "cloture", req: marc, tech: karim, ago: 160, resH: 70, diag: "Prise murale non brassée.", work: "Brassage de la prise au switch.", mats: [["Cordon RJ45 Cat6", 2, 4]], cost: 20 },
  ];

  for (const s of seeds) {
    const e = s.sn ? E(s.sn) : undefined;
    const created = at(s.ago);
    const resolved = s.resH != null ? new Date(new Date(created).getTime() + s.resH * 3_600_000).toISOString() : null;
    const { data: tk } = await db.from("tickets").insert({
      title: s.t, description: s.d, category: s.c as never, priority: s.p as never, status: s.s as never,
      equipment_id: e?.id ?? null, room_id: e?.room_id ?? null, requester_id: s.req, assigned_to: s.tech ?? null,
      rejection_reason: s.reason ?? null, resolved_at: resolved, closed_at: s.s === "cloture" ? resolved : null,
      created_at: created, updated_at: resolved ?? created, is_demo: true,
    }).select("id").single();
    if (!tk) continue;
    if (s.tech) {
      await db.from("ticket_assignments").insert({ ticket_id: tk.id, technician_id: s.tech, assigned_by: admin, status: s.s === "affecte" ? "en_attente" : "acceptee", created_at: at(s.ago, 1) });
      await db.from("ticket_history").insert({ ticket_id: tk.id, actor_id: admin, action: "Affectation", details: "Affectation par l'administrateur", created_at: at(s.ago, 1) });
    }
    if (s.s !== "nouveau") await db.from("ticket_history").insert({ ticket_id: tk.id, actor_id: s.tech ?? admin, action: "Changement de statut", from_status: "nouveau", to_status: s.s as never, created_at: resolved ?? at(s.ago, 2) });
    if (s.tech && ["en_cours", "en_attente_piece", "resolu", "cloture"].includes(s.s)) {
      const { data: iv } = await db.from("interventions").insert({
        ticket_id: tk.id, technician_id: s.tech, diagnosis: s.diag ?? "Diagnostic en cours.", work_done: s.work ?? "",
        started_at: at(s.ago, 2), ended_at: resolved, result: resolved ? "reussie" : "en_cours", labor_cost: s.cost ?? 0,
      }).select("id").single();
      if (iv && s.mats) await db.from("intervention_materials").insert(s.mats.map(([name, quantity, unit_cost]) => ({ intervention_id: iv.id, name, quantity, unit_cost })));
      await db.from("ticket_comments").insert({ ticket_id: tk.id, author_id: s.tech, body: "Je prends en charge, je passe dans la journée.", created_at: at(s.ago, 3) });
    }
  }
  return { created: true };
});

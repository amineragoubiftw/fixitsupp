# Fixitsupp

Crée le projet FixIT : Système de gestion du support et de la maintenance informatique (ITSM) en suivant scrupuleusement les spécifications du fichier joint "PROJECT FixIT – IT Support & Maintenance (pasted).md" et les directives de design du fichier "DESIGN DIRECTION UPGRADE — FIXIT (pasted).md" inspirées de "SORA-card-site-guide.pdf".

Spécifications majeures à implémenter :
1. Langue de l'application : Français intégral (labels, menus, boutons, statuts, notifications, formulaires, messages d'erreur).
2. Rôles et contrôle d'accès :
   - Administrateur (gestion utilisateurs/techniciens, inventaire équipements, tous tickets, statistiques globales, configuration)
   - Technicien (tickets assignés, acceptation/refus motivé, rapports d'intervention, pièces détachées, diagnostic, stats perso)
   - Demandeur (Enseignant / Personnel : création ticket, suivi statut, historique, confirmation de clôture)
3. Modules complets et fonctionnels (CRUD réel relié à la base de données) :
   - Tableau de bord principal différencié par rôle
   - Gestion des tickets (cycle de vie : Nouveau, En cours, Résolu, Clôturé, Rejeté, priorités, catégories, pièces jointes, timeline)
   - Gestion des interventions (technicien, date, pièces utilisées, coût, diagnostic, rapport)
   - Gestion du parc informatique et inventaire (équipements, catégories, numéro de série, bâtiment/salle, état, historique des pannes)
   - Gestion des techniciens et de la charge de travail
   - Rapports et statistiques (MTTR, pannes récurrentes, tickets par période/catégorie/priorité, exports)
   - Système de notifications temps réel / alertes
4. Direction visuelle SORA :
   - Palette bleu nuit minéral profond (#080C14 / #0D1527), surfaces cool dark, touches d'accent cyan et bleu électrique
   - Typographie soignée et hiérarchisée (Inter / Geist), cartes multicouches subtiles avec légers halos lumineux
   - Animations GSAP et transitions fluides dosées, préservant la lisibilité et l'efficacité opérationnelle des tableaux et formulaires
5. Données de démonstration réalistes pour tester immédiatement les 3 rôles avec sélecteur de rôle/compte de test rapide.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fixitsupp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e99bd3a9-dc5d-4076-95a8-e065ee1a2407).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

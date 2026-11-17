
create type public.app_role as enum ('admin','technicien','demandeur');
create type public.ticket_status as enum ('nouveau','en_attente_affectation','affecte','en_cours','en_attente_piece','resolu','cloture','rejete');
create type public.ticket_priority as enum ('basse','moyenne','haute','critique');
create type public.ticket_category as enum ('materiel','logiciel','reseau','imprimante','systeme','securite','autre');
create type public.equipment_status as enum ('operationnel','en_panne','en_maintenance','hors_service');
create type public.assignment_status as enum ('en_attente','acceptee','refusee');

create table public.departments (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.buildings (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.rooms (id uuid primary key default gen_random_uuid(), building_id uuid not null references public.buildings(id) on delete cascade, name text not null, unique(building_id,name));
create table public.equipment_categories (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  department_id uuid references public.departments(id) on delete set null,
  specialization text,
  available boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null, unique(user_id,role));

create sequence public.equipment_seq start 1001;
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique default ('EQ-' || nextval('public.equipment_seq')),
  name text not null,
  category_id uuid not null references public.equipment_categories(id),
  brand text, model text, serial_number text unique,
  purchase_date date, warranty_end date,
  room_id uuid references public.rooms(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  condition text default 'Bon',
  status public.equipment_status not null default 'operationnel',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.ticket_seq start 1;
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('TK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text,5,'0')),
  title text not null check (char_length(title) between 3 and 200),
  description text not null,
  category public.ticket_category not null default 'autre',
  priority public.ticket_priority not null default 'moyenne',
  status public.ticket_status not null default 'nouveau',
  equipment_id uuid references public.equipment(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  resolved_at timestamptz, closed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status public.assignment_status not null default 'en_attente',
  reason text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create table public.ticket_comments (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade, author_id uuid not null references public.profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 4000), created_at timestamptz not null default now());
create table public.ticket_history (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade, actor_id uuid references public.profiles(id) on delete set null, action text not null, from_status public.ticket_status, to_status public.ticket_status, details text, created_at timestamptz not null default now());
create table public.ticket_attachments (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.tickets(id) on delete cascade, uploaded_by uuid not null references public.profiles(id) on delete cascade, file_path text not null, file_name text not null, mime_type text, size_bytes bigint, created_at timestamptz not null default now());

create sequence public.intervention_seq start 1;
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('INT-' || lpad(nextval('public.intervention_seq')::text,5,'0')),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  diagnosis text not null default '',
  work_done text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  result text not null default 'en_cours' check (result in ('en_cours','reussie','partielle','echec')),
  labor_cost numeric(10,2) not null default 0 check (labor_cost >= 0),
  remarks text,
  created_at timestamptz not null default now()
);
create table public.intervention_materials (id uuid primary key default gen_random_uuid(), intervention_id uuid not null references public.interventions(id) on delete cascade, name text not null, quantity int not null default 1 check (quantity > 0), unit_cost numeric(10,2) not null default 0 check (unit_cost >= 0));
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, body text, link text, read boolean not null default false, created_at timestamptz not null default now());
create table public.system_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

grant select, insert, update, delete on public.departments, public.buildings, public.rooms, public.equipment_categories to authenticated;
grant select, insert, update, delete on public.profiles, public.equipment, public.tickets, public.ticket_assignments, public.ticket_comments, public.ticket_attachments, public.interventions, public.intervention_materials, public.notifications, public.system_settings to authenticated;
grant select on public.ticket_history to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.can_access_ticket(_ticket_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tickets t where t.id=_ticket_id and (t.requester_id=auth.uid() or t.assigned_to=auth.uid() or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.ticket_assignments a where a.ticket_id=t.id and a.technician_id=auth.uid())))
$$;

alter table public.departments enable row level security;
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.equipment_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.equipment enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_materials enable row level security;
alter table public.notifications enable row level security;
alter table public.system_settings enable row level security;

do $$ declare t text; begin
  foreach t in array array['departments','buildings','rooms','equipment_categories'] loop
    execute format('create policy "lecture %1$s" on public.%1$s for select to authenticated using (true)', t);
    execute format('create policy "admin %1$s" on public.%1$s for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop; end $$;

create policy "profils lisibles" on public.profiles for select to authenticated using (true);
create policy "profil propre" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "admin profils" on public.profiles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "roles lecture" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin') or role='technicien');
create policy "admin roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "equipements lisibles" on public.equipment for select to authenticated using (true);
create policy "admin equipements" on public.equipment for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "technicien maj equipement" on public.equipment for update to authenticated using (public.has_role(auth.uid(),'technicien')) with check (public.has_role(auth.uid(),'technicien'));

create policy "tickets lecture" on public.tickets for select to authenticated using (public.can_access_ticket(id));
create policy "tickets creation" on public.tickets for insert to authenticated with check (requester_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "tickets maj" on public.tickets for update to authenticated using (requester_id=auth.uid() or assigned_to=auth.uid() or public.has_role(auth.uid(),'admin')) with check (true);
create policy "tickets suppression" on public.tickets for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "affectations lecture" on public.ticket_assignments for select to authenticated using (public.can_access_ticket(ticket_id));
create policy "affectations admin" on public.ticket_assignments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "affectations reponse" on public.ticket_assignments for update to authenticated using (technician_id=auth.uid()) with check (technician_id=auth.uid());

create policy "commentaires lecture" on public.ticket_comments for select to authenticated using (public.can_access_ticket(ticket_id));
create policy "commentaires ajout" on public.ticket_comments for insert to authenticated with check (author_id=auth.uid() and public.can_access_ticket(ticket_id));
create policy "commentaires suppr" on public.ticket_comments for delete to authenticated using (author_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "historique lecture" on public.ticket_history for select to authenticated using (public.can_access_ticket(ticket_id));

create policy "pj lecture" on public.ticket_attachments for select to authenticated using (public.can_access_ticket(ticket_id));
create policy "pj ajout" on public.ticket_attachments for insert to authenticated with check (uploaded_by=auth.uid() and public.can_access_ticket(ticket_id));
create policy "pj suppr" on public.ticket_attachments for delete to authenticated using (uploaded_by=auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "interventions lecture" on public.interventions for select to authenticated using (technician_id=auth.uid() or public.can_access_ticket(ticket_id));
create policy "interventions ajout" on public.interventions for insert to authenticated with check (public.has_role(auth.uid(),'admin') or (technician_id=auth.uid() and exists (select 1 from public.tickets t where t.id=ticket_id and t.assigned_to=auth.uid())));
create policy "interventions maj" on public.interventions for update to authenticated using (technician_id=auth.uid() or public.has_role(auth.uid(),'admin')) with check (technician_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "interventions suppr" on public.interventions for delete to authenticated using (technician_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "materiel lecture" on public.intervention_materials for select to authenticated using (exists (select 1 from public.interventions i where i.id=intervention_id and (i.technician_id=auth.uid() or public.can_access_ticket(i.ticket_id))));
create policy "materiel ecriture" on public.intervention_materials for all to authenticated using (exists (select 1 from public.interventions i where i.id=intervention_id and (i.technician_id=auth.uid() or public.has_role(auth.uid(),'admin')))) with check (exists (select 1 from public.interventions i where i.id=intervention_id and (i.technician_id=auth.uid() or public.has_role(auth.uid(),'admin'))));

create policy "notifs propres" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "notifs maj" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "notifs suppr" on public.notifications for delete to authenticated using (user_id=auth.uid());

create policy "parametres lecture" on public.system_settings for select to authenticated using (true);
create policy "parametres admin" on public.system_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'demandeur') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.notify(_user uuid, _title text, _body text, _link text) returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title,body,link) select _user,_title,_body,_link where _user is not null and _user is distinct from auth.uid();
$$;

create or replace function public.status_label(s public.ticket_status) returns text language sql immutable as $$
  select case s when 'nouveau' then 'Nouveau' when 'en_attente_affectation' then 'En attente d''affectation' when 'affecte' then 'Affecté' when 'en_cours' then 'En cours' when 'en_attente_piece' then 'En attente de pièce' when 'resolu' then 'Résolu' when 'cloture' then 'Clôturé' else 'Rejeté' end $$;

create or replace function public.tickets_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  new.updated_at := now();
  if uid is not null and not public.has_role(uid,'admin') then
    if new.requester_id <> old.requester_id then raise exception 'Modification non autorisée'; end if;
    if uid = old.assigned_to then
      if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then raise exception 'Réaffectation réservée à l''administrateur'; end if;
      if new.status = 'cloture' and old.status <> 'cloture' then raise exception 'Seul le demandeur peut clôturer'; end if;
    elsif uid = old.requester_id then
      if new.assigned_to is distinct from old.assigned_to or new.priority <> old.priority or new.title <> old.title then raise exception 'Modification non autorisée'; end if;
      if new.status <> old.status and not (old.status='resolu' and new.status in ('cloture','en_cours')) then raise exception 'Transition de statut non autorisée'; end if;
    end if;
  end if;
  if new.status='resolu' and old.status<>'resolu' then new.resolved_at := now(); end if;
  if new.status='cloture' and old.status<>'cloture' then new.closed_at := now(); end if;
  if new.status='en_cours' and old.status='resolu' then new.resolved_at := null; end if;
  return new;
end $$;
create trigger tickets_guard before update on public.tickets for each row execute function public.tickets_guard();

create or replace function public.tickets_after() returns trigger language plpgsql security definer set search_path = public as $$
declare a record; link text := '/tickets/' || new.id;
begin
  if tg_op='INSERT' then
    insert into public.ticket_history(ticket_id,actor_id,action,to_status,details,created_at) values (new.id, coalesce(auth.uid(),new.requester_id),'Création',new.status,'Ticket créé',new.created_at);
    for a in select user_id from public.user_roles where role='admin' loop
      perform public.notify(a.user_id,'Nouveau ticket '||new.reference,new.title,link);
    end loop;
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.ticket_history(ticket_id,actor_id,action,from_status,to_status) values (new.id,auth.uid(),'Changement de statut',old.status,new.status);
    perform public.notify(new.requester_id,'Ticket '||new.reference||' : '||public.status_label(new.status),new.title,link);
    if new.assigned_to is not null then perform public.notify(new.assigned_to,'Ticket '||new.reference||' : '||public.status_label(new.status),new.title,link); end if;
    if new.status='en_cours' and old.status='resolu' then
      for a in select user_id from public.user_roles where role='admin' loop perform public.notify(a.user_id,'Ticket rouvert '||new.reference,new.title,link); end loop;
    end if;
  end if;
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    insert into public.ticket_history(ticket_id,actor_id,action,details) select new.id,auth.uid(),'Affectation','Affecté à '||p.full_name from public.profiles p where p.id=new.assigned_to;
    perform public.notify(new.assigned_to,'Nouveau ticket affecté '||new.reference,new.title,link);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.ticket_history(ticket_id,actor_id,action,details) values (new.id,auth.uid(),'Priorité modifiée',old.priority||' → '||new.priority);
  end if;
  return new;
end $$;
create trigger tickets_after after insert or update on public.tickets for each row execute function public.tickets_after();

create or replace function public.assignment_after() returns trigger language plpgsql security definer set search_path = public as $$
declare t record; a record;
begin
  if new.status is distinct from old.status and new.status<>'en_attente' then
    select * into t from public.tickets where id=new.ticket_id;
    insert into public.ticket_history(ticket_id,actor_id,action,details) values (new.ticket_id,new.technician_id, case when new.status='acceptee' then 'Affectation acceptée' else 'Affectation refusée' end, new.reason);
    for a in select user_id from public.user_roles where role='admin' loop
      perform public.notify(a.user_id, case when new.status='acceptee' then 'Affectation acceptée ' else 'Affectation refusée ' end || t.reference, coalesce(new.reason,t.title), '/tickets/'||t.id);
    end loop;
  end if;
  return new;
end $$;
create trigger assignment_after after update on public.ticket_assignments for each row execute function public.assignment_after();

create or replace function public.comment_after() returns trigger language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from public.tickets where id=new.ticket_id;
  perform public.notify(t.requester_id,'Nouveau commentaire sur '||t.reference,left(new.body,120),'/tickets/'||t.id);
  perform public.notify(t.assigned_to,'Nouveau commentaire sur '||t.reference,left(new.body,120),'/tickets/'||t.id);
  insert into public.ticket_history(ticket_id,actor_id,action,details) values (t.id,new.author_id,'Commentaire',left(new.body,120));
  return new;
end $$;
create trigger comment_after after insert on public.ticket_comments for each row execute function public.comment_after();

create or replace function public.intervention_after() returns trigger language plpgsql security definer set search_path = public as $$
declare t record; a record;
begin
  select * into t from public.tickets where id=new.ticket_id;
  if tg_op='INSERT' then
    insert into public.ticket_history(ticket_id,actor_id,action,details) values (t.id,new.technician_id,'Intervention ouverte',new.reference);
  end if;
  if new.ended_at is not null and (tg_op='INSERT' or old.ended_at is null) then
    insert into public.ticket_history(ticket_id,actor_id,action,details) values (t.id,new.technician_id,'Intervention terminée',new.reference||' — '||new.result);
    perform public.notify(t.requester_id,'Intervention terminée '||new.reference,t.title,'/tickets/'||t.id);
    for a in select user_id from public.user_roles where role='admin' loop perform public.notify(a.user_id,'Intervention terminée '||new.reference,t.title,'/interventions/'||new.id); end loop;
  end if;
  return new;
end $$;
create trigger intervention_after after insert or update on public.interventions for each row execute function public.intervention_after();

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tickets;

create policy "pj storage lecture" on storage.objects for select to authenticated using (bucket_id='attachments' and public.can_access_ticket(((storage.foldername(name))[1])::uuid));
create policy "pj storage ajout" on storage.objects for insert to authenticated with check (bucket_id='attachments' and public.can_access_ticket(((storage.foldername(name))[1])::uuid));
create policy "pj storage suppr" on storage.objects for delete to authenticated using (bucket_id='attachments' and owner=auth.uid());

insert into public.departments(name) values ('Informatique'),('Mathématiques'),('Physique'),('Lettres'),('Administration'),('Bibliothèque'),('Scolarité');
insert into public.buildings(name) values ('Bâtiment A'),('Bâtiment B'),('Bâtiment C'),('Administration');
insert into public.rooms(building_id,name) select b.id, r from public.buildings b, unnest(array['Salle 101','Salle 102','Salle 201','Labo 1','Amphi']) r;
insert into public.equipment_categories(slug,name) values ('desktop','Ordinateur de bureau'),('laptop','Ordinateur portable'),('printer','Imprimante'),('router','Routeur'),('switch','Switch'),('projector','Vidéoprojecteur'),('server','Serveur'),('other','Autre équipement');
insert into public.system_settings(key,value) values ('organisation','{"name":"Université FixIT Démo","sla_critique_h":4,"sla_haute_h":24,"sla_moyenne_h":72,"sla_basse_h":168}');

insert into public.equipment(name,category_id,brand,model,serial_number,purchase_date,warranty_end,room_id,department_id,condition,status,is_demo)
select v.name, c.id, v.brand, v.model, v.sn, v.pd::date, v.we::date,
  (select r.id from public.rooms r join public.buildings b on b.id=r.building_id where b.name=v.bld and r.name=v.room),
  (select d.id from public.departments d where d.name=v.dept), v.cond, v.st::public.equipment_status, true
from (values
 ('PC Labo Info 01','desktop','Dell','OptiPlex 7090','DL7090-A01','2022-09-01','2025-09-01','Bâtiment A','Labo 1','Informatique','Bon','operationnel'),
 ('PC Labo Info 02','desktop','Dell','OptiPlex 7090','DL7090-A02','2022-09-01','2025-09-01','Bâtiment A','Labo 1','Informatique','Moyen','en_panne'),
 ('PC Labo Info 03','desktop','HP','EliteDesk 800','HP800-A03','2023-02-15','2026-02-15','Bâtiment A','Labo 1','Informatique','Bon','operationnel'),
 ('Portable Direction','laptop','Lenovo','ThinkPad T14','LNT14-ADM1','2024-01-10','2027-01-10','Administration','Salle 101','Administration','Excellent','operationnel'),
 ('Portable Prêt 04','laptop','HP','ProBook 450','HP450-P04','2021-10-05','2024-10-05','Bâtiment B','Salle 102','Bibliothèque','Usé','en_maintenance'),
 ('Imprimante Scolarité','printer','HP','LaserJet M507','HPM507-SC1','2020-06-12','2023-06-12','Administration','Salle 102','Scolarité','Moyen','en_panne'),
 ('Multifonction Salle des profs','printer','Canon','imageRUNNER 2630','CAN2630-SP','2022-03-20','2026-12-31','Bâtiment B','Salle 201','Lettres','Bon','operationnel'),
 ('Routeur principal','router','Cisco','ISR 4331','CSISR-001','2021-01-15','2026-01-15','Administration','Salle 201','Informatique','Bon','operationnel'),
 ('Switch Bât. A','switch','Cisco','Catalyst 2960','CS2960-A','2019-11-01','2024-11-01','Bâtiment A','Salle 101','Informatique','Moyen','operationnel'),
 ('Switch Bât. C','switch','HPE','Aruba 2930F','AR2930-C','2023-05-01','2028-05-01','Bâtiment C','Salle 101','Informatique','Excellent','operationnel'),
 ('Vidéoprojecteur Amphi A','projector','Epson','EB-L610U','EPL610-AMA','2022-08-30','2025-08-30','Bâtiment A','Amphi','Physique','Moyen','en_maintenance'),
 ('Vidéoprojecteur Salle 201','projector','BenQ','MH560','BQ560-B201','2020-09-01','2023-09-01','Bâtiment B','Salle 201','Mathématiques','Usé','hors_service'),
 ('Serveur ENT','server','Dell','PowerEdge R740','PER740-ENT','2021-04-01','2026-04-01','Bâtiment C','Labo 1','Informatique','Bon','operationnel'),
 ('Serveur fichiers','server','HPE','ProLiant DL380','DL380-FS1','2019-02-01','2024-02-01','Bâtiment C','Labo 1','Informatique','Moyen','operationnel'),
 ('PC Bibliothèque 01','desktop','Lenovo','ThinkCentre M70','LNM70-BIB1','2023-09-01','2026-09-01','Bâtiment B','Salle 101','Bibliothèque','Bon','operationnel'),
 ('Borne Wi-Fi Amphi C','other','Ubiquiti','UniFi U6 Pro','UBU6-AMC','2024-02-01','2026-12-01','Bâtiment C','Amphi','Informatique','Excellent','operationnel')
) v(name,cat,brand,model,sn,pd,we,bld,room,dept,cond,st) join public.equipment_categories c on c.slug=v.cat;

CREATE OR REPLACE FUNCTION public.is_app_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_app_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_app_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "lecture buildings" ON public.buildings;
CREATE POLICY "lecture buildings" ON public.buildings FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "lecture departments" ON public.departments;
CREATE POLICY "lecture departments" ON public.departments FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "lecture rooms" ON public.rooms;
CREATE POLICY "lecture rooms" ON public.rooms FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "parametres lecture" ON public.system_settings;
CREATE POLICY "parametres lecture" ON public.system_settings FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
DROP POLICY IF EXISTS "equipements lisibles" ON public.equipment;
CREATE POLICY "equipements lisibles" ON public.equipment FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'technicien') OR public.is_app_member(auth.uid()));

DROP POLICY IF EXISTS "profils lisibles" ON public.profiles;
CREATE POLICY "profils lisibles" ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'technicien')
  OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = profiles.id AND r.role IN ('technicien','admin'))
  OR EXISTS (SELECT 1 FROM public.tickets t WHERE (t.requester_id = profiles.id OR t.assigned_to = profiles.id) AND public.can_access_ticket(t.id))
);

DROP POLICY IF EXISTS "tickets maj" ON public.tickets;
CREATE POLICY "tickets maj" ON public.tickets FOR UPDATE TO authenticated
  USING ((requester_id = auth.uid()) OR (assigned_to = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((requester_id = auth.uid()) OR (assigned_to = auth.uid()) OR public.has_role(auth.uid(),'admin'));
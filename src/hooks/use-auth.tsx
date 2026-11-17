import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/labels";

export type Profile = { id: string; full_name: string; email: string; phone: string | null; department_id: string | null; specialization: string | null; available: boolean };
type AuthCtx = { session: Session | null; profile: Profile | null; role: Role | null; loading: boolean; refresh: () => Promise<void> };
const Ctx = createContext<AuthCtx>({ session: null, profile: null, role: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(s: Session | null) {
    setSession(s);
    if (!s) { setProfile(null); setRole(null); setLoading(false); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p as Profile | null);
    const roles = (r ?? []).map((x) => x.role as Role);
    setRole(roles.includes("admin") ? "admin" : roles.includes("technicien") ? "technicien" : "demandeur");
    setLoading(false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => load(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, profile, role, loading, refresh: () => load(session) }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

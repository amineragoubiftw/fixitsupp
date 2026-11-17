import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Accès réservé aux administrateurs");
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    email: z.string().email("Adresse e-mail invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    full_name: z.string().min(2).max(100),
    role: z.enum(["admin", "technicien", "demandeur"]),
    specialization: z.string().max(100).optional(),
    department_id: z.string().uuid().nullable().optional(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message.includes("already") ? "Cette adresse e-mail est déjà utilisée" : "Création impossible");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").update({ full_name: data.full_name, specialization: data.specialization ?? null, department_id: data.department_id ?? null }).eq("id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    return { id };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Suppression impossible (des tickets sont peut-être liés)");
    return { ok: true };
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), role: z.enum(["admin", "technicien", "demandeur"]) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId && data.role !== "admin") throw new Error("Vous ne pouvez pas retirer votre propre rôle administrateur");
    await context.supabase.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await context.supabase.from("user_roles").insert({ user_id: data.id, role: data.role });
    if (error) throw new Error("Mise à jour du rôle impossible");
    return { ok: true };
  });

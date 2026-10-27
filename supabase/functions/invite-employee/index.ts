import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return reply({ error: "POST only." }, 405);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return reply({ error: "Invalid JSON." }, 400);
    }

    const storeId = String(body.store_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const role = String(body.role ?? "").trim().toLowerCase();

    if (!storeId || !email || !fullName || !["manager", "cashier"].includes(role)) {
      return reply({
        error: "store_id, email, full_name, and role (manager/cashier) are required.",
      }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Enter a valid email address." }, 400);
    }

    const userId = ctx.userClaims?.sub;
    if (!userId) return reply({ error: "Login required." }, 401);

    const { data: membership, error: membershipError } = await ctx.supabase
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      return reply({ error: "Could not verify store permissions." }, 403);
    }
    if (membership?.role !== "owner") {
      return reply({ error: "Only the store owner can invite employees." }, 403);
    }

    const { data: invite, error: inviteError } =
      await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });

    if (inviteError || !invite.user) {
      return reply({ error: inviteError?.message ?? "Invitation failed." }, 400);
    }

    const invitedUserId = invite.user.id;

    const { error: roleError } = await ctx.supabaseAdmin
      .from("store_members")
      .insert({ store_id: storeId, user_id: invitedUserId, role });

    if (roleError) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      return reply({ error: "Could not assign the employee role." }, 500);
    }

    const { error: employeeError } = await ctx.supabaseAdmin
      .from("employees")
      .insert({
        store_id: storeId,
        user_id: invitedUserId,
        name: fullName,
        phone: phone || null,
        role_title: role === "manager" ? "Manager" : "Cashier",
        status: "active",
      });

    if (employeeError) {
      await ctx.supabaseAdmin
        .from("store_members")
        .delete()
        .eq("store_id", storeId)
        .eq("user_id", invitedUserId);
      await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      return reply({ error: "Could not save the employee record." }, 500);
    }

    return reply({
      success: true,
      message: "Invitation sent and employee role assigned.",
      employee_id: invitedUserId,
      role,
    }, 201);
  }),
};

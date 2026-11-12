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

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId) ||
        !email || email.length > 254 || !fullName || fullName.length > 120 ||
        phone.length > 30 || !["manager", "cashier"].includes(role)) {
      return reply({
        error: "A valid store, email, employee name and role (manager/cashier) are required.",
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
      const code = String(inviteError?.code ?? "").toLowerCase();
      const message = String(inviteError?.message ?? "");
      const duplicate = ["email_exists", "user_already_exists", "identity_already_exists"].includes(code) ||
        /already registered|already exists|already invited|email.*taken/i.test(message);
      return reply({
        error: duplicate
          ? "This email already has an account or invitation."
          : "Invitation could not be sent. Check the email address and try again.",
      }, duplicate ? 409 : 400);
    }

    const invitedUserId = invite.user.id;

    const { error: roleError } = await ctx.supabaseAdmin
      .from("store_members")
      .insert({ store_id: storeId, user_id: invitedUserId, role });

    if (roleError) {
      const { error: cleanupError } = await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      const duplicate = roleError.code === "23505";
      if (cleanupError) {
        return reply({ error: "Invitation failed and account cleanup could not be confirmed. Contact the administrator before retrying." }, 500);
      }
      return reply({
        error: duplicate ? "This employee already belongs to the store." : "Could not assign the employee role.",
      }, duplicate ? 409 : 500);
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
      const { error: cleanupError } = await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      if (cleanupError) {
        return reply({ error: "Invitation failed and account cleanup could not be confirmed. Contact the administrator before retrying." }, 500);
      }
      const duplicate = employeeError.code === "23505";
      return reply({
        error: duplicate ? "This employee already belongs to the store." : "Could not save the employee record.",
      }, duplicate ? 409 : 500);
    }

    return reply({
      success: true,
      message: "Invitation sent and employee role assigned.",
      employee_id: invitedUserId,
      role,
    }, 201);
  }),
};

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return reply({ error: "POST only." }, 405);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return reply({ error: "Invalid JSON." }, 400);
    }

    const storeId = String(body.store_id ?? "").trim();
    const employeeId = String(body.employee_id ?? "").trim();
    if (!UUID.test(storeId) || !UUID.test(employeeId)) {
      return reply({ error: "A valid store and employee are required." }, 400);
    }
    const userId = ctx.userClaims?.sub;
    if (!userId) return reply({ error: "Login required." }, 401);

    const { data: membership, error: membershipError } = await ctx.supabase
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) return reply({ error: "Could not verify store permissions." }, 403);
    if (membership?.role !== "owner") return reply({ error: "Only the store owner can remove employee access." }, 403);

    const { data: employee, error: employeeError } = await ctx.supabaseAdmin
      .from("employees")
      .select("id,user_id")
      .eq("store_id", storeId)
      .eq("id", employeeId)
      .maybeSingle();
    if (employeeError) return reply({ error: "Could not verify the employee record." }, 500);
    if (!employee) return reply({ error: "Employee record was not found in this store." }, 404);
    if (!employee.user_id) return reply({ error: "This employee has no linked sign-in account." }, 409);

    const { data: targetMembership, error: targetError } = await ctx.supabaseAdmin
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", employee.user_id)
      .maybeSingle();
    if (targetError) return reply({ error: "Could not verify the employee role." }, 500);
    if (targetMembership?.role === "owner") return reply({ error: "The store owner cannot be removed as an employee." }, 409);

    if (targetMembership) {
      const { error: revokeError } = await ctx.supabaseAdmin
        .from("store_members")
        .delete()
        .eq("store_id", storeId)
        .eq("user_id", employee.user_id);
      if (revokeError) return reply({ error: "Could not revoke employee access." }, 500);
    }

    const { error: deleteError } = await ctx.supabaseAdmin
      .from("employees")
      .delete()
      .eq("store_id", storeId)
      .eq("id", employeeId);
    if (deleteError) {
      return reply({ error: "Store access was revoked, but the employee row could not be removed. Retry to finish cleanup." }, 500);
    }

    return reply({ success: true, employee_id: employeeId, access_revoked: Boolean(targetMembership) });
  }),
};

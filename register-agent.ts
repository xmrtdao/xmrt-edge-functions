import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const { name, role = "agent", capabilities = [], endpoint = "", version = "0.1.0", owner = "", contact = "", agent_id } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: "name is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data, error } = await supabaseAdmin
      .from("agents")
      .upsert({
        id: agent_id ?? crypto.randomUUID(),
        name,
        role,
        capabilities: Array.isArray(capabilities) ? capabilities : [],
        endpoint,
        version,
        owner,
        contact,
        status: "IDLE",
        last_seen: new Date().toISOString(),
      }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ agent: data, status: "registered" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

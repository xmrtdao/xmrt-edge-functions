// register-agent — Self-registration edge function for XMRT DAO fleet agents
// Deploy: supabase functions deploy register-agent
//
// Usage:
// POST /functions/v1/register-agent
// {
//   "agent_id": "08c62c10-43ad-4ba2-90b5-37412af5e7ae",
//   "name": "Eliza",
//   "role": "manager",
//   "status": "ONLINE",
//   "capabilities": ["orchestrate", "mine", "relay"],
//   "endpoint": "https://cloud.eliza.xmrt.io",
//   "version": "2.0.0"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterPayload {
  agent_id?: string;
  name: string;
  role?: string;
  status?: "ONLINE" | "BUSY" | "IDLE" | "OFFLINE" | "ERROR" | "ARCHIVED";
  capabilities?: string[];
  endpoint?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      return jsonError(500, "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    }

    const body: RegisterPayload = await req.json().catch(() => ({} as RegisterPayload));

    // Validation
    if (!body.name || body.name.length < 1 || body.name.length > 64) {
      return jsonError(400, "name is required (1-64 chars)");
    }

    const agentId = body.agent_id || crypto.randomUUID();
    const now = new Date().toISOString();

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert into agents table
    const record = {
      id: agentId,
      name: body.name,
      role: body.role || "agent",
      status: body.status || "ONLINE",
      capabilities: body.capabilities || [],
      endpoint: body.endpoint || null,
      version: body.version || "0.0.0",
      metadata: body.metadata || {},
      last_seen: now,
      registered_at: now,
    };

    const { data, error } = await supabase
      .from("agents")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[register-agent] DB error:", error);
      return jsonError(500, error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: data.id,
        name: data.name,
        status: data.status,
        registered_at: data.registered_at,
        message: `Agent ${data.name} registered successfully`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[register-agent] error:", err);
    return jsonError(500, (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

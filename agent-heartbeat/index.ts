// agent-heartbeat — Minimal ping to update agent last_seen timestamp
// Deploy: supabase functions deploy agent-heartbeat
//
// Usage:
// POST /functions/v1/agent-heartbeat
// {
//   "agent_id": "08c62c10-43ad-4ba2-90b5-37412af5e7ae",
//   "status": "BUSY",
//   "tasks_active": 3
// }
//
// This is lighter than agent-status — it only touches the agents table
// without requiring full capability payload.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeartbeatPayload {
  agent_id: string;
  status?: "ONLINE" | "BUSY" | "IDLE" | "OFFLINE" | "ERROR";
  tasks_active?: number;
  uptime_secs?: number;
  endpoint?: string;
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

    const body: HeartbeatPayload = await req.json().catch(() => ({} as HeartbeatPayload));

    if (!body.agent_id) {
      return jsonError(400, "agent_id is required");
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();
    const update: Record<string, any> = { last_seen: now };

    if (body.status) update.status = body.status;
    if (body.tasks_active !== undefined) {
      update.metadata = { tasks_active: body.tasks_active, heartbeat_at: now };
    }
    if (body.uptime_secs !== undefined) {
      update.metadata = { ...(update.metadata || {}), uptime_secs: body.uptime_secs };
    }
    if (body.endpoint) update.endpoint = body.endpoint;

    const { data, error } = await supabase
      .from("agents")
      .update(update)
      .eq("id", body.agent_id)
      .select()
      .single();

    if (error) {
      console.error("[agent-heartbeat] DB error:", error);
      return jsonError(500, error.message);
    }

    if (!data) {
      return jsonError(404, `agent ${body.agent_id} not found — register first via register-agent`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: data.id,
        name: data.name,
        status: data.status,
        last_seen: data.last_seen,
        message: `Heartbeat acknowledged for ${data.name}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[agent-heartbeat] error:", err);
    return jsonError(500, (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

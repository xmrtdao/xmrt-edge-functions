// task-status-update — Update task status in XMRT DAO fleet
// Deploy: supabase functions deploy task-status-update
//
// Usage:
// POST /functions/v1/task-status-update
// {
//   "task_id": "task-12345",
//   "status": "completed",
//   "result": "Build finished",
//   "agent_id": "08c62c10-43ad-4ba2-90b5-37412af5e7ae"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskUpdatePayload {
  task_id: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "blocked";
  result?: string;
  error?: string;
  agent_id: string;
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

    const body: TaskUpdatePayload = await req.json().catch(() => ({} as TaskUpdatePayload));

    if (!body.task_id || !body.status || !body.agent_id) {
      return jsonError(400, "task_id, status, and agent_id are required");
    }

    const validStatuses = ["pending", "in_progress", "completed", "failed", "cancelled", "blocked"];
    if (!validStatuses.includes(body.status)) {
      return jsonError(400, `invalid status. valid: ${validStatuses.join(", ")}`);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .upsert(
        {
          id: body.task_id,
          status: body.status,
          result: body.result || null,
          error: body.error || null,
          agent_id: body.agent_id,
          metadata: body.metadata || {},
          updated_at: now,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[task-status-update] DB error:", error);
      return jsonError(500, error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: data.id,
        status: data.status,
        updated_at: data.updated_at,
        message: `Task ${data.id} updated to ${data.status}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[task-status-update] error:", err);
    return jsonError(500, (err as Error).message);
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

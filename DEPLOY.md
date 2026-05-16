# Edge Functions — Deploy Instructions

## register-agent
```bash
# From supabase project root
supabase functions deploy register-agent
# Or via Management API (requires service role key)
```

## Auth Requirements
- `SUPABASE_SERVICE_ROLE_KEY` must be valid (currently dead/token expired)
- Fix 401 by regenerating at: https://supabase.com/dashboard/project/vawouugtzwmejxqkeqqj/settings/api

## Status
| Function | Deployed | Blocker |
|----------|----------|---------|
| register-agent | NO | Supabase 401 |
| agent-status | NO | Supabase 401 |
| agent-heartbeat | NO | Supabase 401 |

## All functions ready in source
See `register-agent.ts` or `functions/register-agent/index.ts`

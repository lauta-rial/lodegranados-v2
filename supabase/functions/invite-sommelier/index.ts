import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Orphaned since Phase 4 (Staff CRUD + host role) replaced this with
// manage-staff (create/revoke admin+host accounts) + assign-host (assign an
// existing host to an event). Nothing in the frontend calls this anymore
// (confirmed via grep). Left running as a stub instead of silently
// deleting: it used to write to `event_sommeliers`, which no longer exists
// (renamed to `event_hosts`), and set `role: 'sommelier'`, which no RLS
// policy recognizes anymore — calling it as-was would invite a real user
// via Supabase auth and then fail, leaving a half-created account with a
// meaningless role. Returning 410 outright avoids that partial-failure
// path entirely. There's no MCP tool to delete an edge function outright;
// this is the safe alternative until it's removed by hand in the
// dashboard.
Deno.serve(() => {
  return new Response(
    JSON.stringify({ error: 'Este endpoint fue reemplazado por manage-staff + assign-host.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  )
})

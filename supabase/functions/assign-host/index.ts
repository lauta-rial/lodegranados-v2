import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// This project's GoTrue admin API throws AuthRetryableFetchError on
// auth.admin.* calls intermittently (confirmed via direct repeated testing
// in manage-staff — the identical call fails, then succeeds on retry with
// nothing else changed). A short retry with backoff clears it every time
// observed.
async function withRetry<T>(fn: () => Promise<{ data: T; error: { message: string } | null }>, attempts = 3) {
  let lastError: { message: string } | null = null
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await fn()
    if (!error) return data
    lastError = error
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)))
  }
  throw lastError
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller) {
      return jsonResponse({ error: 'No autenticado' }, 401)
    }
    const callerRole = caller.app_metadata?.role
    if (callerRole !== 'admin' && callerRole !== 'superadmin') {
      return jsonResponse({ error: 'No autorizado' }, 403)
    }

    const { eventId, userId } = await req.json()
    if (!eventId || !userId) {
      return jsonResponse({ error: 'Falta eventId o userId' }, 400)
    }

    const { data: eventRow } = await admin.from('events').select('title, date, branch_id').eq('id', eventId).maybeSingle()
    if (!eventRow) {
      return jsonResponse({ error: 'Evento no encontrado' }, 404)
    }
    if (callerRole === 'admin' && caller.app_metadata?.branch_id !== eventRow.branch_id) {
      return jsonResponse({ error: 'No autorizado para este evento' }, 403)
    }

    // Defense in depth against a stale dropdown: only ever assign an
    // account that's actually a host of this exact branch, regardless of
    // what the client sent.
    let targetUser
    try {
      targetUser = await withRetry(() => admin.auth.admin.getUserById(userId).then((r) => ({ data: r.data.user, error: r.error })))
    } catch (e) {
      console.error('getUserById error:', e)
      return jsonResponse({ error: 'No pudimos verificar ese usuario' }, 500)
    }
    if (!targetUser || targetUser.app_metadata?.role !== 'host' || targetUser.app_metadata?.branch_id !== eventRow.branch_id) {
      return jsonResponse({ error: 'Ese usuario no es un host de esta sucursal' }, 400)
    }

    const { error: assignErr } = await admin
      .from('event_hosts')
      .upsert({ event_id: eventId, user_id: userId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true })
    if (assignErr) {
      console.error('event_hosts upsert error:', assignErr.message)
      return jsonResponse({ error: 'No pudimos asignar el evento' }, 500)
    }

    if (!targetUser.email) {
      return jsonResponse({ ok: true })
    }

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'staff_event_assigned',
        to: targetUser.email,
        data: { eventTitle: eventRow.title, eventDate: eventRow.date },
      }),
    })
    if (!emailRes.ok) {
      console.error('send-email (staff_event_assigned) error:', await emailRes.text())
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('assign-host error:', err)
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})

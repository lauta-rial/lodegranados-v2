import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Service-role client — needed for auth.admin.* (invite/update users), which
// bypasses RLS entirely. Creating admin/host accounts is superadmin-only,
// checked explicitly below (a branch admin must never be able to mint other
// admin accounts, even their own branch's).
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// admin.auth.admin.listUsers() is broken on this project past page 1 —
// confirmed via direct testing: {page:1} always succeeds, {page:2}+ always
// throws AuthRetryableFetchError, regardless of perPage. Scanning by
// pagination would work today (20 users, fits in ~2 pages) but breaks the
// moment the user count crosses whatever page 1 holds. find_user_by_email
// is a SQL function (service-role only) that queries auth.users directly,
// sidestepping that broken endpoint entirely — see migration
// add_find_user_by_email_rpc.
async function findUserByEmail(email: string) {
  const { data, error } = await admin.rpc('find_user_by_email', { p_email: email })
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  return { id: row.id, email: row.email, app_metadata: row.app_metadata as Record<string, unknown> }
}

async function sendStaffEmail(type: string, to: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, to, data }),
  })
  if (!res.ok) {
    console.error(`send-email (${type}) error:`, await res.text())
  }
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
    // Only a superadmin may create/revoke admin or host accounts — this is
    // a privilege-granting action, a branch admin creating other admins
    // (even for their own branch) would be a privilege-escalation path.
    if (caller.app_metadata?.role !== 'superadmin') {
      return jsonResponse({ error: 'No autorizado' }, 403)
    }

    const body = await req.json()

    if (body.action === 'revoke') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'Falta userId' }, 400)
      const { data: target } = await admin.auth.admin.getUserById(userId)
      if (!target?.user) return jsonResponse({ error: 'Usuario no encontrado' }, 404)
      const { error } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...target.user.app_metadata, role: null, branch_id: null },
      })
      if (error) {
        console.error('revoke updateUserById error:', error.message)
        return jsonResponse({ error: 'No pudimos quitar el acceso' }, 500)
      }
      return jsonResponse({ ok: true })
    }

    // action === 'invite' (default)
    const { email, role, branchId } = body
    if (!email || (role !== 'admin' && role !== 'host')) {
      return jsonResponse({ error: 'Falta email o el rol no es válido' }, 400)
    }
    if (!branchId) {
      return jsonResponse({ error: 'Falta la sucursal' }, 400)
    }

    let target
    try {
      target = await findUserByEmail(email)
    } catch (e) {
      console.error('findUserByEmail error:', e)
      return jsonResponse({ error: 'No pudimos verificar ese email' }, 500)
    }

    if (!target) {
      // This is email #1 ("confirmar la cuenta") — Supabase's own invite
      // flow, which lets the recipient set a password and activates the
      // account.
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email)
      if (error) {
        console.error('inviteUserByEmail error:', error.message)
        return jsonResponse({ error: 'No pudimos invitar a ese email' }, 500)
      }
      target = { id: data.user.id, email: data.user.email, app_metadata: data.user.app_metadata }
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, {
      app_metadata: { ...target.app_metadata, role, branch_id: branchId },
    })
    if (updateErr) {
      console.error('updateUserById error:', updateErr.message)
      return jsonResponse({ error: 'No pudimos asignar el rol' }, 500)
    }

    // Email #2 ("mail de bienvenida") — separate from the confirm-account
    // email above, explains what the role means.
    await sendStaffEmail('staff_welcome', email, { role })

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('manage-staff error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Error interno' }, 500)
  }
})

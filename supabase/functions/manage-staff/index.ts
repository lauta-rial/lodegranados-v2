import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { corsHeaders, jsonResponse, handleOptions } from "../_shared/http.ts"
import { getCaller, withRetry } from "../_shared/auth.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Service-role client — needed for auth.admin.* (invite/update users), which
// bypasses RLS entirely. Creating admin/host accounts is superadmin-only,
// checked explicitly below (a branch admin must never be able to mint other
// admin accounts, even their own branch's).
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
  const opts = handleOptions(req)
  if (opts) return opts

  try {
    const callerResult = await getCaller(req, admin)
    if ('response' in callerResult) return callerResult.response
    const caller = callerResult.user

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
      let target
      try {
        target = await withRetry(() => admin.auth.admin.getUserById(userId).then((r) => ({ data: r.data?.user ?? null, error: r.error })))
      } catch {
        return jsonResponse({ error: 'Usuario no encontrado' }, 404)
      }
      if (!target) return jsonResponse({ error: 'Usuario no encontrado' }, 404)
      try {
        await withRetry(() => admin.auth.admin.updateUserById(userId, {
          app_metadata: { ...target.app_metadata, role: null, branch_id: null },
        }).then((r) => ({ data: r.data?.user ?? null, error: r.error })))
      } catch (e) {
        console.error('revoke updateUserById error:', e)
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
      try {
        target = await withRetry(() => admin.auth.admin.inviteUserByEmail(email).then((r) => ({ data: r.data?.user ?? null, error: r.error })))
      } catch (e) {
        console.error('inviteUserByEmail error:', e)
        return jsonResponse({ error: 'No pudimos invitar a ese email' }, 500)
      }
    }

    if (!target) {
      return jsonResponse({ error: 'No pudimos invitar a ese email' }, 500)
    }

    try {
      await withRetry(() => admin.auth.admin.updateUserById(target.id, {
        app_metadata: { ...target.app_metadata, role, branch_id: branchId },
      }).then((r) => ({ data: r.data?.user ?? null, error: r.error })))
    } catch (e) {
      console.error('updateUserById error:', e)
      return jsonResponse({ error: 'No pudimos asignar el rol' }, 500)
    }

    // Email #2 ("mail de bienvenida") — separate from the confirm-account
    // email above, explains what the role means.
    await sendStaffEmail('staff_welcome', email, { role })

    return jsonResponse({ ok: true })
  } catch (err) {
    // Generic message on purpose — this used to return err.message directly,
    // which could leak internal Postgres/GoTrue error text to the caller.
    // Every other function here (send-email, assign-host, mp-webhook,
    // create-mp-preference) already returns a generic message on the
    // catch-all; this brings manage-staff in line with that.
    console.error('manage-staff error:', err)
    return jsonResponse({ error: 'Error interno' }, 500)
  }
})

import { createClient } from "jsr:@supabase/supabase-js@2"

export type MpCreds = { accessToken: string; webhookSecret: string }

// Resolve which MercadoPago account a branch collects into. Falls back to the
// global MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET env when the branch has no row in
// branch_mp_credentials — so branches that haven't loaded their own MP account
// keep billing through the winery's shared one, and no branch is ever left
// unable to charge. (branch_mp_credentials has RLS with no policies, so only
// the service_role client used by the edge functions can read it.)
export async function getBranchMp(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  branchId: string | null | undefined,
): Promise<MpCreds> {
  const globalToken = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
  const globalSecret = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''
  if (!branchId) return { accessToken: globalToken, webhookSecret: globalSecret }

  const { data } = await supabase
    .from('branch_mp_credentials')
    .select('access_token, webhook_secret')
    .eq('branch_id', branchId)
    .maybeSingle()

  return {
    accessToken: data?.access_token || globalToken,
    webhookSecret: data?.webhook_secret || globalSecret,
  }
}

// external_reference stamped on each per-user preapproval so the webhook — and
// send-email — can recover which branch/user/plan a subscription belongs to.
// We create the preapproval WITHOUT a preapproval_plan_id (inline
// auto_recurring instead) — that's the only shape MP returns an init_point for
// while preserving our external_reference — so the plan association also has to
// travel here rather than via preapproval_plan_id. Format
// `sub:<branchId>:<userId>:<planId>`; userId is empty for guest checkouts.
// All three are UUIDs (colon-free), so a plain split is unambiguous.
// MercadoPago's POST /preapproval returns a 500 "Internal server error" when
// payer_email contains plus-addressing (juan+tag@gmail.com) — a real, RFC-valid
// address form. Since a `+tag` is by definition a sub-address of the same
// mailbox, and the pending-preapproval flow re-resolves the real payer at the
// init_point (MP echoes payer_email back empty anyway), stripping the tag is a
// safe way past MP's broken validation. `juan+wine@gmail.com` -> `juan@gmail.com`.
export function sanitizePayerEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at < 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const plus = local.indexOf('+')
  return plus < 0 ? email : local.slice(0, plus) + domain
}

export function encodeSubRef(branchId: string, userId: string | null | undefined, planId: string): string {
  return `sub:${branchId}:${userId ?? ''}:${planId}`
}

export function decodeSubRef(
  ref: string | null | undefined,
): { branchId: string | null; userId: string | null; planId: string | null } {
  if (!ref || !ref.startsWith('sub:')) return { branchId: null, userId: null, planId: null }
  const parts = ref.split(':')
  return { branchId: parts[1] || null, userId: parts[2] || null, planId: parts[3] || null }
}

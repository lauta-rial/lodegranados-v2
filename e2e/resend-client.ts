const RESEND_API_KEY = process.env.RESEND_API_KEY

type ResendEmail = {
  id: string
  to: string[]
  subject: string
  last_event: string
  created_at: string
  html?: string
  text?: string
}

function assertApiKey() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY env var is required to run e2e tests (needs "Full access" or a key that can read /emails).')
  }
}

async function listRecentEmails(limit = 20): Promise<ResendEmail[]> {
  assertApiKey()
  const res = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  })
  if (!res.ok) throw new Error(`Resend list emails failed: ${res.status} ${await res.text()}`)
  const body = await res.json()
  return body.data ?? []
}

async function getEmail(id: string): Promise<ResendEmail> {
  assertApiKey()
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  })
  if (!res.ok) throw new Error(`Resend get email failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Polls Resend until an email to `to` with a subject matching `subjectMatch` shows up, then returns it with full content. */
export async function waitForEmail(
  to: string,
  subjectMatch: string | RegExp,
  { timeoutMs = 30_000, intervalMs = 2_000 } = {},
): Promise<ResendEmail> {
  const deadline = Date.now() + timeoutMs
  const matches = (subj: string) =>
    typeof subjectMatch === 'string' ? subj === subjectMatch : subjectMatch.test(subj)

  while (Date.now() < deadline) {
    const emails = await listRecentEmails(20)
    const found = emails.find((e) => e.to?.includes(to) && matches(e.subject))
    if (found) return getEmail(found.id)
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out waiting for email to ${to} matching "${subjectMatch}"`)
}

/** Extracts the Supabase auth confirmation URL from an email's text/HTML body. */
export function extractConfirmationUrl(email: ResendEmail): string {
  const body = email.text ?? email.html ?? ''
  const match = body.match(/https:\/\/[^\s"'<>]*\/auth\/v1\/verify\?[^\s"'<>]*/)
  if (!match) throw new Error(`No confirmation URL found in email body:\n${body}`)
  return match[0].replace(/&amp;/g, '&')
}

import type { User } from '@supabase/supabase-js'

// Single source of truth for reading role/branch out of a Supabase user —
// AdminLayout.tsx (route gate) and AdminContext.tsx (branch-scoping for admin
// queries) used to each re-derive this inline. If the metadata shape ever
// changes (e.g. app_metadata.role -> app_metadata.roles[]), there's now one
// place to update instead of two that can silently drift apart.
export type AdminRole = 'admin' | 'superadmin' | null

export function getUserRole(user: User | null | undefined): AdminRole {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role ?? null
  return role === 'admin' || role === 'superadmin' ? role : null
}

export function getUserBranchId(user: User | null | undefined): string | null {
  return user?.app_metadata?.branch_id ?? user?.user_metadata?.branch_id ?? null
}

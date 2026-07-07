import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ClubRedemption = { period: string; redeemed_at: string }

export type MySubscription = {
  id: string
  plan_id: string | null
  branch_id: string | null
  start_date: string | null
  status: string
  redeem_token: string
  plans: { name: string; emoji: string | null; price: number | null } | null
  club_redemptions: ClubRedemption[]
}

// One source of truth for "what is this user subscribed to" — used by both
// MiCuenta (list every active sub + its QR) and ClubPlan (is THIS plan already
// active?). A member can hold several active subs (one per plan), so this
// always returns an array; callers filter by plan_id when they need one.
export function useMySubscriptions(userId: string | undefined) {
  return useQuery<MySubscription[]>({
    queryKey: ['my-subscriptions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_id, branch_id, start_date, status, redeem_token, plans(name, emoji, price), club_redemptions(period, redeemed_at)')
        .eq('user_id', userId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as any
    },
    enabled: !!userId,
  })
}

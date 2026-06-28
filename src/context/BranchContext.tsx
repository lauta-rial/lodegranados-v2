import { createContext, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/Skeleton'
import { Link } from 'react-router-dom'
import type { Branch } from '@/types/database'

const BranchContext = createContext<Branch | null>(null)

export function useBranch() {
  return useContext(BranchContext)
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { branchSlug } = useParams<{ branchSlug: string }>()

  const { data: branch, isLoading, isError } = useQuery<Branch>({
    queryKey: ['branch', branchSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('slug', branchSlug!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!branchSlug,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !branch) {
    return (
      <div className="mx-auto max-w-lg px-4 py-32 text-center sm:px-6">
        <p className="font-display text-5xl font-light text-[var(--color-dark)]">404</p>
        <p className="mt-4 text-lg text-[var(--color-dark-muted)]">
          No encontramos la sucursal <strong>"{branchSlug}"</strong>.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white hover:bg-[var(--color-wine-dark)] transition-colors"
        >
          Ver todas las sucursales
        </Link>
      </div>
    )
  }

  return (
    <BranchContext.Provider value={branch}>
      {children}
    </BranchContext.Provider>
  )
}

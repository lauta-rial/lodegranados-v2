import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Branch } from '@/types/database'

export function Home() {
  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data
    },
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #2c1810 0%, #7b1c35 40%, #c4956a 100%)' }}
        />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4956a]">
            Argentina
          </p>
          <h1 className="mt-3 font-display text-5xl font-light leading-none text-white sm:text-6xl lg:text-7xl">
            Lo de Granados
          </h1>
          <p className="mt-4 max-w-lg text-white/70">
            Catas, cursos y Club DeVinos. Encontrá tu sucursal más cercana.
          </p>
        </div>
      </section>

      {/* Branches grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Nuestras sucursales
          </p>
          <h2 className="mt-3 font-display text-3xl font-light text-[var(--color-dark)]">
            Elegí la tuya
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(branches ?? []).map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function BranchCard({ branch }: { branch: Branch }) {
  return (
    <Link
      to={`/${branch.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--color-parchment)] bg-white p-6 transition-all hover:border-[var(--color-wine)]/30 hover:shadow-md"
    >
      <p className="font-display text-xl font-semibold text-[var(--color-dark)] group-hover:text-[var(--color-wine)] transition-colors">
        {branch.name}
      </p>
      {(branch.address || branch.city) && (
        <div className="mt-2 flex items-start gap-1.5">
          <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
          <p className="text-sm text-[var(--color-dark-muted)]">
            {branch.address ? branch.address : branch.city}
            {branch.address && branch.city && branch.city !== 'Rosario' ? `, ${branch.city}` : ''}
          </p>
        </div>
      )}
      {branch.phone && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">{branch.phone}</p>
      )}
      <span className="mt-auto pt-4 text-xs font-medium text-[var(--color-wine)] opacity-0 transition-opacity group-hover:opacity-100">
        Ver sucursal →
      </span>
    </Link>
  )
}

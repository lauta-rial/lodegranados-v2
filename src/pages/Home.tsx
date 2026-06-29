import { Link } from 'react-router-dom'
import { MapPin, ArrowRight } from 'lucide-react'
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

  const rosario = branches?.filter((b) => b.city === 'Rosario' || !b.city) ?? []
  const otras = branches?.filter((b) => b.city && b.city !== 'Rosario') ?? []

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[55vh] items-end overflow-hidden">
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
            Red de sucursales · Argentina
          </p>
          <h1 className="mt-3 font-display text-5xl font-light leading-none text-white sm:text-6xl lg:text-7xl">
            Lo de Granados
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Catas de vino, cursos de sommelier y Club DeVinos. Encontrá tu sucursal más cercana.
          </p>
        </div>
      </section>

      {/* Branches */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {rosario.length > 0 && (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">Rosario</p>
                  <div className="h-px flex-1 bg-[var(--color-parchment)]" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rosario.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} />
                  ))}
                </div>
              </div>
            )}

            {otras.length > 0 && (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">Otras localidades</p>
                  <div className="h-px flex-1 bg-[var(--color-parchment)]" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {otras.map((branch) => (
                    <BranchCard key={branch.id} branch={branch} />
                  ))}
                </div>
              </div>
            )}
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
      className="group flex min-h-[110px] flex-col justify-between rounded-2xl border border-[var(--color-parchment)] bg-white p-5 transition-all hover:border-[var(--color-wine)]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold text-[var(--color-dark)] group-hover:text-[var(--color-wine)] transition-colors">
          {branch.name}
        </p>
        {branch.city && branch.city !== 'Rosario' && (
          <span className="shrink-0 rounded-full bg-[var(--color-cream-dark)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {branch.city}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        {branch.address ? (
          <div className="flex items-start gap-1.5 mt-2">
            <MapPin size={12} className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
            <p className="text-xs text-[var(--color-muted)] leading-snug">{branch.address}</p>
          </div>
        ) : (
          <span />
        )}
        <ArrowRight
          size={14}
          className="shrink-0 text-[var(--color-wine)] opacity-0 transition-opacity group-hover:opacity-100 ml-2"
        />
      </div>
    </Link>
  )
}

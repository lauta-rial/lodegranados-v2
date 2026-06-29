import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const { error } = await supabase.from('newsletter').insert({ email })
      if (error) {
        if (error.code === '23505') {
          setStatus('duplicate')
        } else {
          throw error
        }
      } else {
        setStatus('success')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="bg-[var(--color-dark)]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-gold)]">
            Newsletter
          </p>
          <h2 className="mt-3 font-display text-3xl font-light text-white">
            Novedades en tu correo
          </h2>
          <p className="mt-3 text-sm text-white/60">
            Catas, cursos nuevos y ofertas del Club — nada de spam.
          </p>

          {status === 'success' ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-8 py-6">
              <p className="font-display text-xl text-white">¡Gracias!</p>
              <p className="mt-1 text-sm text-white/60">Ya estás en la lista.</p>
            </div>
          ) : status === 'duplicate' ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-8 py-6">
              <p className="text-sm text-white/60">Ese email ya está suscripto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder-white/40 focus:border-white/40 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-full bg-[var(--color-wine)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:opacity-60"
              >
                {status === 'loading' ? 'Enviando…' : 'Suscribirme'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-xs text-red-400">Algo salió mal. Intentá de nuevo.</p>
          )}
        </div>
      </div>
    </section>
  )
}

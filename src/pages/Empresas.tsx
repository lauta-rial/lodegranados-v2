import { useState, type FormEvent } from 'react'
import { MessageCircle, Mail, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function Empresas() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: dbError } = await supabase.from('inquiries').insert({
        name: form.name,
        email: form.email,
        message: form.message,
        status: 'new',
      })
      if (dbError) throw dbError
      setDone(true)
    } catch {
      setError('No pudimos enviar tu consulta. Intentá de nuevo o escribinos por WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <section
        className="relative py-24"
        style={{ background: 'linear-gradient(135deg, #2c1810 0%, #7b1c35 100%)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c4956a]">
            Corporativo
          </p>
          <h1 className="mt-3 font-display text-5xl font-light text-white sm:text-6xl">
            Experiencias para empresas
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Team buildings, eventos de fin de año, agasajos a clientes. Diseñamos experiencias
            vínicas únicas para tu empresa en Mendoza.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Info */}
          <div>
            <h2 className="font-display text-3xl text-[var(--color-dark)]">
              ¿Qué ofrecemos?
            </h2>
            <div className="mt-8 space-y-6">
              {[
                {
                  icon: Building2,
                  title: 'Team Buildings',
                  desc: 'Catas guiadas, competencias de maridaje y experiencias colaborativas para equipos de trabajo.',
                },
                {
                  icon: MessageCircle,
                  title: 'Eventos exclusivos',
                  desc: 'Presentaciones de producto, cenas maridadas, lanzamientos y celebraciones con sello enológico.',
                },
                {
                  icon: Mail,
                  title: 'Regalos corporativos',
                  desc: 'Curadería de vinos con packaging premium. Ideal para clientes, proveedores y fin de año.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-wine)]/10">
                    <Icon size={18} className="text-[var(--color-wine)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-dark)]">{title}</p>
                    <p className="mt-1 text-sm text-[var(--color-dark-muted)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl bg-[var(--color-cream-dark)] p-6">
              <p className="font-semibold text-[var(--color-dark)]">Respuesta rápida por WhatsApp</p>
              <p className="mt-1 text-sm text-[var(--color-dark-muted)]">
                Si necesitás una respuesta inmediata, escribinos directamente.
              </p>
              <a
                href="https://wa.me/5492612345678"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle size={16} />
                Escribir por WhatsApp
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            {done ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[var(--color-parchment)] bg-white p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-wine)]/10 text-3xl">
                  🍷
                </div>
                <h3 className="mt-4 font-display text-2xl text-[var(--color-dark)]">
                  ¡Consulta recibida!
                </h3>
                <p className="mt-2 text-[var(--color-dark-muted)]">
                  Nos ponemos en contacto con vos en las próximas 24 horas.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-parchment)] bg-white p-8">
                <h2 className="font-display text-2xl text-[var(--color-dark)]">
                  Envianos tu consulta
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Contanos qué tenés en mente y te armamos una propuesta.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--color-dark)]">
                      Nombre y empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Juan Pérez — Empresa SRL"
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--color-dark)]">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={set('email')}
                      placeholder="juan@empresa.com"
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-[var(--color-dark)]">
                      ¿Qué tenés en mente?
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Contanos la ocasión, cantidad de personas, fecha estimada..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-wine)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)] disabled:opacity-60"
                  >
                    {loading ? 'Enviando...' : 'Enviar consulta'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-parchment)] bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-wine)] focus:outline-none focus:ring-2 focus:ring-[var(--color-wine)]/20 transition-colors'

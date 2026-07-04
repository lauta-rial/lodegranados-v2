import { useState } from 'react'
import { EventsTab } from '@/components/admin/EventsTab'
import { RegistrationsTab } from '@/components/admin/RegistrationsTab'

type Tab = 'courses' | 'enrollments'

export function AdminCursos() {
  const [tab, setTab] = useState<Tab>('courses')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Cursos</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Gestión de cursos e inscripciones</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {(['courses', 'enrollments'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-[var(--color-wine)] text-white' : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'}`}
          >
            {t === 'courses' ? 'Cursos' : 'Inscripciones'}
          </button>
        ))}
      </div>

      {tab === 'courses' ? <EventsTab kind="curso" /> : <RegistrationsTab kind="curso" />}
    </div>
  )
}

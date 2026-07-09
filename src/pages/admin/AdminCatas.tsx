import { useState } from 'react'
import { EventsTab } from '@/components/admin/EventsTab'
import { RegistrationsTab } from '@/components/admin/RegistrationsTab'

type Tab = 'events' | 'registrations'

export function AdminCatas() {
  const [tab, setTab] = useState<Tab>('events')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[var(--color-dark)]">Catas</h1>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-[var(--color-parchment)] bg-white p-1 w-fit">
        {(['events', 'registrations'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[var(--color-wine)] text-white'
                : 'text-[var(--color-dark-muted)] hover:text-[var(--color-dark)]'
            }`}
          >
            {t === 'events' ? 'Catas' : 'Inscripciones'}
          </button>
        ))}
      </div>

      {tab === 'events' ? <EventsTab kind="cata" /> : <RegistrationsTab kind="cata" />}
    </div>
  )
}

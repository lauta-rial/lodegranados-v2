import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaqItem {
  q: string
  a: string
}

interface Category {
  emoji: string
  title: string
  items: FaqItem[]
}

const categories: Category[] = [
  {
    emoji: '🍷',
    title: 'Club DeVinos',
    items: [
      {
        q: '¿Cómo funciona el Club DeVinos?',
        a: 'Cada mes recibís una selección de vinos curada por nuestro sommelier, según el plan que elegiste. Los vinos llegan directamente a tu domicilio con una guía de cata incluida.',
      },
      {
        q: '¿Puedo pausar o cancelar mi suscripción?',
        a: 'Sí, podés pausar o cancelar tu suscripción en cualquier momento desde tu cuenta. No hay permanencia mínima ni penalidades.',
      },
      {
        q: '¿Qué pasa si no me gusta algún vino?',
        a: 'Nos importa tu experiencia. Si algún vino no cumplió tus expectativas, contanos y lo tenemos en cuenta para las próximas selecciones.',
      },
      {
        q: '¿Los precios incluyen el envío?',
        a: 'Sí, el envío está incluido en todos los planes dentro de la ciudad de Mendoza. Para otras localidades consultanos por WhatsApp.',
      },
    ],
  },
  {
    emoji: '🥂',
    title: 'Catas y Cursos',
    items: [
      {
        q: '¿Necesito saber de vino para ir a una cata?',
        a: 'Para nada. Nuestras catas están diseñadas para todos los niveles, desde curiosos hasta amantes del vino. El sommelier explica todo en un ambiente distendido.',
      },
      {
        q: '¿Cómo reservo mi lugar en una cata?',
        a: 'Desde la página de cada cata podés reservar tu lugar pagando vía MercadoPago. El pago es seguro y confirmás tu reserva al instante.',
      },
      {
        q: '¿Qué incluyen los cursos?',
        a: 'Cada curso incluye el material teórico, los vinos para las degustaciones en clase y el certificado de asistencia. Algunos cursos ofrecen certificación profesional adicional.',
      },
      {
        q: '¿Puedo transferir mi lugar si no puedo asistir?',
        a: 'Sí, podés transferir tu lugar a otra persona hasta 48 horas antes del evento. Contactanos por WhatsApp para coordinarlo.',
      },
    ],
  },
  {
    emoji: '📦',
    title: 'Envíos y Pagos',
    items: [
      {
        q: '¿Qué medios de pago aceptan?',
        a: 'Aceptamos todos los medios disponibles en MercadoPago: tarjetas de crédito y débito, transferencia bancaria y efectivo en puntos de pago.',
      },
      {
        q: '¿En cuánto tiempo llegan los vinos del club?',
        a: 'Los envíos del club se realizan entre los días 5 y 10 de cada mes. Recibís una notificación cuando tu paquete está en camino.',
      },
      {
        q: '¿Hacen envíos a todo el país?',
        a: 'Sí, hacemos envíos a todo Argentina. El costo varía según la localidad. Para Capital Federal y GBA el envío tiene un costo adicional que se informa al suscribirte.',
      },
    ],
  },
  {
    emoji: '📍',
    title: 'Ubicación y Contacto',
    items: [
      {
        q: '¿Dónde están ubicados?',
        a: 'Estamos en Av. San Martín 1234, Ciudad de Mendoza. Las catas y cursos se realizan en nuestras instalaciones o en espacios seleccionados de la ciudad.',
      },
      {
        q: '¿Tienen estacionamiento?',
        a: 'Contamos con estacionamiento para clientes en la misma dirección. Para eventos nocturnos recomendamos llegar en remise o taxi ya que habrá degustación de alcohol.',
      },
      {
        q: '¿Cómo puedo contactarlos?',
        a: 'Por WhatsApp al +54 261 423-4567, por email a info@lodegranados.com, o completando el formulario en la sección Empresas. Respondemos en menos de 24 horas.',
      },
    ],
  },
]

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Preguntas frecuentes
        </p>
        <h1 className="mt-3 font-display text-5xl font-light text-[var(--color-dark)]">
          ¿En qué podemos ayudarte?
        </h1>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.title}>
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-[var(--color-dark)]">
              <span>{cat.emoji}</span>
              {cat.title}
            </h2>
            <div className="divide-y divide-[var(--color-parchment)] rounded-2xl border border-[var(--color-parchment)] bg-white">
              {cat.items.map((item) => (
                <AccordionItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-[var(--color-cream-dark)] p-8 text-center">
        <p className="font-display text-xl text-[var(--color-dark)]">
          ¿No encontraste tu respuesta?
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Escribinos por WhatsApp y te respondemos al instante.
        </p>
        <a
          href="https://wa.me/5492612345678"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-wine)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wine-dark)]"
        >
          Escribir por WhatsApp
        </a>
      </div>
    </div>
  )
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-medium text-[var(--color-dark)]">{question}</span>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-[var(--color-muted)] transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <p className="px-6 pb-5 text-sm leading-relaxed text-[var(--color-dark-muted)]">
          {answer}
        </p>
      </div>
    </div>
  )
}

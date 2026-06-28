import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { AuthLayout, Field, SubmitButton, ErrorMsg, GoogleButton, Divider, inputClass } from './auth-shared'

export function Register() {
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
      supabase.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: email,
          name: email.split('@')[0],
          data: { siteUrl: window.location.origin },
        },
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="¡Revisá tu email!" subtitle="Te enviamos un enlace de confirmación">
        <div className="rounded-2xl bg-[var(--color-cream-dark)] p-6 text-center">
          <p className="text-[var(--color-dark-muted)]">
            Revisá tu bandeja de entrada en <strong>{email}</strong> y hacé clic en el enlace para activar tu cuenta.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          <Link to="/login" className="font-medium text-[var(--color-wine)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Unite a la comunidad Lo de Granados">
      <GoogleButton />
      <Divider />
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputClass}
          />
        </Field>

        <Field label="Contraseña">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className={inputClass}
          />
        </Field>

        <Field label="Confirmar contraseña">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repetí tu contraseña"
            className={inputClass}
          />
        </Field>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-[var(--color-wine)] hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </AuthLayout>
  )
}

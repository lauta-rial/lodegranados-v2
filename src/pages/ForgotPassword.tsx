import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout, Field, SubmitButton, ErrorMsg, inputClass } from './auth-shared'

export function ForgotPassword() {
  const { resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el email')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Email enviado" subtitle="Revisá tu bandeja de entrada">
        <div className="rounded-2xl bg-[var(--color-cream-dark)] p-6 text-center">
          <p className="text-[var(--color-dark-muted)]">
            Si existe una cuenta con <strong>{email}</strong>, vas a recibir un enlace para restablecer tu contraseña.
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
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para restablecerla"
    >
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

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <SubmitButton loading={loading}>Enviar enlace</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        <Link to="/login" className="font-medium text-[var(--color-wine)] hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </AuthLayout>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout, Field, SubmitButton, ErrorMsg, GoogleButton, Divider, inputClass } from './auth-shared'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Ingresá a tu cuenta de Lo de Granados"
    >
      <GoogleButton />
      <Divider />
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" error={undefined}>
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

        <Field label="Contraseña" error={undefined}>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--color-wine)] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <SubmitButton loading={loading}>Ingresar</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="font-medium text-[var(--color-wine)] hover:underline">
          Registrate
        </Link>
      </p>
    </AuthLayout>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout, Field, SubmitButton, ErrorMsg, inputClass } from './auth-shared'

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      await updatePassword(password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elegí una contraseña segura">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Nueva contraseña">
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

        <SubmitButton loading={loading}>Guardar contraseña</SubmitButton>
      </form>
    </AuthLayout>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { BranchLayout } from '@/components/layout/BranchLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

import { Home } from '@/pages/Home'
import { BranchHome } from '@/pages/BranchHome'
import { Catas } from '@/pages/Catas'
import { CataDetail } from '@/pages/CataDetail'
import { Club } from '@/pages/Club'
import { Cursos } from '@/pages/Cursos'
import { CursoDetail } from '@/pages/CursoDetail'
import { Empresas } from '@/pages/Empresas'
import { Faq } from '@/pages/Faq'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { MiCuenta } from '@/pages/MiCuenta'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminCatas } from '@/pages/admin/AdminCatas'
import { AdminCursos } from '@/pages/admin/AdminCursos'
import { AdminClub } from '@/pages/admin/AdminClub'
import { AdminConsultas } from '@/pages/admin/AdminConsultas'
import { ClubPlan } from '@/pages/ClubPlan'
import { PagoExitoso } from '@/pages/PagoExitoso'
import { PagoFallido } from '@/pages/PagoFallido'
import { PagoPendiente } from '@/pages/PagoPendiente'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Global routes — no branch context */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mi-cuenta" element={<ProtectedRoute><MiCuenta /></ProtectedRoute>} />
            <Route path="/pago-exitoso" element={<PagoExitoso />} />
            <Route path="/pago-fallido" element={<PagoFallido />} />
            <Route path="/pago-pendiente" element={<PagoPendiente />} />
          </Route>

          {/* Branch-specific routes — all content filtered by branch */}
          <Route path="/:branchSlug" element={<BranchLayout />}>
            <Route index element={<BranchHome />} />
            <Route path="catas" element={<Catas />} />
            <Route path="catas/:id" element={<CataDetail />} />
            <Route path="cursos" element={<Cursos />} />
            <Route path="cursos/:id" element={<CursoDetail />} />
            <Route path="club" element={<Club />} />
            <Route path="club/:id" element={<ClubPlan />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="faq" element={<Faq />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="catas" element={<AdminCatas />} />
            <Route path="cursos" element={<AdminCursos />} />
            <Route path="club" element={<AdminClub />} />
            <Route path="consultas" element={<AdminConsultas />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

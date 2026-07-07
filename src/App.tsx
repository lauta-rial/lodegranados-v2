import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { BranchLayout } from '@/components/layout/BranchLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { SuperAdminRoute } from '@/components/admin/SuperAdminRoute'
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
import { Bienvenido } from '@/pages/Bienvenido'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { MiCuenta } from '@/pages/MiCuenta'
import { ClubPlan } from '@/pages/ClubPlan'
import { PagoExitoso } from '@/pages/PagoExitoso'
import { PagoFallido } from '@/pages/PagoFallido'
import { PagoPendiente } from '@/pages/PagoPendiente'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminCatas = lazy(() => import('@/pages/admin/AdminCatas').then(m => ({ default: m.AdminCatas })))
const AdminCursos = lazy(() => import('@/pages/admin/AdminCursos').then(m => ({ default: m.AdminCursos })))
const AdminClub = lazy(() => import('@/pages/admin/AdminClub').then(m => ({ default: m.AdminClub })))
const AdminConsultas = lazy(() => import('@/pages/admin/AdminConsultas').then(m => ({ default: m.AdminConsultas })))
const AdminSucursales = lazy(() => import('@/pages/admin/AdminSucursales').then(m => ({ default: m.AdminSucursales })))
const AdminNewsletter = lazy(() => import('@/pages/admin/AdminNewsletter').then(m => ({ default: m.AdminNewsletter })))
const AdminStaff = lazy(() => import('@/pages/admin/AdminStaff').then(m => ({ default: m.AdminStaff })))
const AdminEventLive = lazy(() => import('@/pages/admin/AdminEventLive').then(m => ({ default: m.AdminEventLive })))
const AdminClubScan = lazy(() => import('@/pages/admin/AdminClubScan').then(m => ({ default: m.AdminClubScan })))

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
            <Route path="/bienvenido" element={<ProtectedRoute><Bienvenido /></ProtectedRoute>} />
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
            <Route index element={<Suspense><AdminDashboard /></Suspense>} />
            <Route path="catas" element={<Suspense><AdminCatas /></Suspense>} />
            <Route path="cursos" element={<Suspense><AdminCursos /></Suspense>} />
            <Route path="club" element={<Suspense><AdminClub /></Suspense>} />
            <Route path="club/scan" element={<Suspense><AdminClubScan /></Suspense>} />
            <Route path="consultas" element={<Suspense><AdminConsultas /></Suspense>} />
            <Route path="sucursales" element={<SuperAdminRoute><Suspense><AdminSucursales /></Suspense></SuperAdminRoute>} />
            <Route path="newsletter" element={<SuperAdminRoute><Suspense><AdminNewsletter /></Suspense></SuperAdminRoute>} />
            <Route path="staff" element={<SuperAdminRoute><Suspense><AdminStaff /></Suspense></SuperAdminRoute>} />
            <Route path="catas/:eventId/live" element={<Suspense><AdminEventLive /></Suspense>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

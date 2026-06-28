import { Outlet } from 'react-router-dom'
import { BranchProvider } from '@/context/BranchContext'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function BranchLayout() {
  return (
    <BranchProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </BranchProvider>
  )
}

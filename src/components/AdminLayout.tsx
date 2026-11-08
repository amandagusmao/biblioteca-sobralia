import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight, BookCopy, Send, ExternalLink, GraduationCap, LayoutDashboard, LogOut, Menu, Monitor, Settings, Users, X,
} from 'lucide-react'
import { ErrorBoundary } from './ErrorBoundary'
import { Logo } from './Logo'
import { DemoBanner } from './DemoBanner'
import { Avatar, Spinner } from './ui'
import { isBalcao, isEquipe, ROLE_LABEL, useAuth } from '../lib/auth'
import { useTable } from '../lib/db'
import { atrasado } from '../lib/services'
import { cn } from '../lib/utils'

export function AdminLayout() {
  const { user, ready, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])

  if (!ready) return <Spinner className="py-40" />
  if (!user) return <Navigate to="/entrar?voltar=/admin" replace />
  if (!isEquipe(user.role)) return <Navigate to="/minha-area" replace />

  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <div className="flex">
        {/* barra lateral */}
        <aside className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy text-blue-100 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}>
          <div className="flex h-16 items-center justify-between px-5">
            <Link to="/admin"><Logo light /></Link>
            <button className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="size-5" /></button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4"><AdminNav /></div>
          <div className="border-t border-white/10 p-3">
            <Link to="/" className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-200 hover:bg-white/10">
              <ExternalLink className="size-4" /> Ver site público
            </Link>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <Avatar name={user.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
                <p className="text-xs text-blue-300">{ROLE_LABEL[user.role]}</p>
              </div>
              <button onClick={() => signOut()} className="rounded-lg p-2 text-blue-200 hover:bg-white/10 hover:text-white" title="Sair" aria-label="Sair">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={() => setOpen(false)} />}

        <div className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
            <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Abrir menu"><Menu className="size-6" /></button>
            <Logo className="scale-90" />
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><ErrorBoundary key={loc.pathname}><Suspense fallback={<Spinner />}><Outlet /></Suspense></ErrorBoundary></main>
        </div>
      </div>
    </div>
  )
}

function AdminNav() {
  const { user } = useAuth()
  const balcao = isBalcao(user?.role)
  const { data: emps } = useTable('emprestimos')
  const { data: insc } = useTable('inscricoes')
  const atrasos = balcao ? emps.filter(atrasado).length : 0
  const pendentes = insc.filter(p => p.status === 'pendente').length

  const items: { to: string; label: string; icon: ReactNode; end?: boolean; show: boolean; badge?: number; tone?: string }[] = [
    { to: '/admin', label: 'Painel', icon: <LayoutDashboard className="size-5" />, end: true, show: true },
    { to: '/admin/emprestimos', label: 'Empréstimos', icon: <ArrowLeftRight className="size-5" />, show: balcao, badge: atrasos, tone: 'bg-red-500' },
    { to: '/admin/livros', label: 'Acervo de livros', icon: <BookCopy className="size-5" />, show: balcao },
    { to: '/admin/pessoas', label: balcao ? 'Leitores e alunos' : 'Alunos', icon: <Users className="size-5" />, show: true },
    { to: '/admin/mensagens', label: 'Mensagens', icon: <Send className="size-5" />, show: true },
    { to: '/admin/cursos', label: 'Cursos e turmas', icon: <GraduationCap className="size-5" />, show: true, badge: pendentes, tone: 'bg-leaf' },
    { to: '/admin/computadores', label: 'Computadores', icon: <Monitor className="size-5" />, show: balcao },
    { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings className="size-5" />, show: balcao },
  ]
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-blue-300/70">Administração</p>
      {items.filter(i => i.show).map(i => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
          isActive ? 'bg-white text-navy shadow-lg' : 'text-blue-100 hover:bg-white/10',
        )}>
          {i.icon}
          <span className="flex-1">{i.label}</span>
          {!!i.badge && <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold text-white', i.tone)}>{i.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function RequireRole({ balcao, children }: { balcao?: boolean; children: ReactNode }) {
  const { user } = useAuth()
  if (balcao && !isBalcao(user?.role)) return <Navigate to="/admin" replace />
  return <>{children}</>
}

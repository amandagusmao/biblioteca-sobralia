import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Clock, LayoutDashboard, LogIn, MapPin, Menu, Phone, UserRound, X } from 'lucide-react'
import { ErrorBoundary } from './ErrorBoundary'
import { Logo } from './Logo'
import { DemoBanner } from './DemoBanner'
import { isEquipe, useAuth } from '../lib/auth'
import { useConfig } from '../lib/db'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/acervo', label: 'Acervo' },
  { to: '/cursos', label: 'Cursos de informática' },
]

export function PublicLayout() {
  const { user } = useAuth()
  const cfg = useConfig()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-xl px-3.5 py-2 text-sm font-semibold transition', isActive ? 'bg-royal/10 text-royal' : 'text-slate-600 hover:bg-slate-100 hover:text-navy')

  const acoes = (
    <>
      {user && isEquipe(user.role) && (
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-ocean">
          <LayoutDashboard className="size-4" /> Painel
        </Link>
      )}
      {user ? (
        <Link to="/minha-area" className="inline-flex items-center gap-2 rounded-xl bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-ocean">
          <UserRound className="size-4" /> Minha área
        </Link>
      ) : (
        <Link to="/entrar" className="inline-flex items-center gap-2 rounded-xl bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-ocean">
          <LogIn className="size-4" /> Entrar
        </Link>
      )}
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Página inicial"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>{n.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">{acoes}</div>
          <button className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setOpen(o => !o)} aria-label="Menu">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {open && (
          <div className="animate-fade-in border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>{n.label}</NavLink>)}
            </nav>
            <div className="mt-3 flex flex-wrap gap-2">{acoes}</div>
          </div>
        )}
      </header>

      <main className="flex-1"><ErrorBoundary key={loc.pathname}><Outlet /></ErrorBoundary></main>

      <footer className="mt-16 bg-navy text-blue-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-200/80">
              {cfg.sobre ?? 'Livros, computadores e cursos de informática gratuitos para toda a comunidade.'}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-bold text-white">Visite a biblioteca</p>
            {cfg.endereco && <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-leaf" />{cfg.endereco}</p>}
            {cfg.horario && <p className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-leaf" />{cfg.horario}</p>}
            {cfg.telefone && <p className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-leaf" />{cfg.telefone}</p>}
          </div>
          <div className="text-sm">
            <p className="mb-3 font-bold text-white">Uma iniciativa da</p>
            <div className="inline-block rounded-2xl bg-white p-3">
              <img src="./prefeitura-sobralia.png" alt="Prefeitura Municipal de Sobrália" className="h-20 w-auto" />
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-blue-200/60">
          © {new Date().getFullYear()} Prefeitura Municipal de Sobrália/MG · Projeto social Biblioteca Digital
        </div>
      </footer>
    </div>
  )
}

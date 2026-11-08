import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { adapter, invalidateAll } from './db'
import type { Role, SessionUser } from './types'

interface AuthCtx {
  user: SessionUser | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (nome: string, email: string, password: string, nascimento: string | null) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (nova: string, atual: string | null) => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

const ATIVIDADE_KEY = 'bd-ultima-atividade'
const LIMITE_INATIVO = 30 * 60_000
let ultimaGravacao = 0

function marcarAtividade(forcar = false) {
  const agora = Date.now()
  if (!forcar && agora - ultimaGravacao < 20_000) return
  ultimaGravacao = agora
  try { localStorage.setItem(ATIVIDADE_KEY, String(agora)) } catch { /* ignora */ }
}

function inativo(): boolean {
  try {
    const v = Number(localStorage.getItem(ATIVIDADE_KEY))
    return !!v && Date.now() - v > LIMITE_INATIVO
  } catch { return false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = async () => {
    let u: SessionUser | null = null
    try { u = await adapter.auth.current() } catch { u = null }
    // Sessão esquecida aberta (ex.: computador público da biblioteca): encerra.
    if (u && inativo()) { await adapter.auth.signOut().catch(() => {}); u = null }
    if (u) marcarAtividade(true)
    setUser(u)
    invalidateAll()
    setReady(true)
  }

  useEffect(() => {
    // Link do e-mail (confirmação de conta ou "esqueci minha senha")
    adapter.auth.consumirLinkEmail().then(r => {
      if (r) marcarAtividade(true)
      if (r === 'recuperacao') window.location.hash = '#/redefinir-senha'
      else if (r === 'confirmado') window.location.hash = '#/minha-area?bemvindo=1'
      else if (r === 'erro') window.location.hash = '#/entrar?link=expirado'
    }).finally(() => refresh())
    return adapter.auth.onChange(() => { refresh() })
  }, [])

  // Saída automática após 30 min sem uso — importante nos computadores de uso público.
  useEffect(() => {
    if (!user) return
    const marcar = () => marcarAtividade()
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach(ev => window.addEventListener(ev, marcar, { passive: true }))
    const t = setInterval(() => { if (inativo()) adapter.auth.signOut() }, 60_000)
    return () => { eventos.forEach(ev => window.removeEventListener(ev, marcar)); clearInterval(t) }
  }, [user])

  return (
    <Ctx.Provider value={{
      user, ready, refresh,
      signIn: (e, p) => { marcarAtividade(true); return adapter.auth.signIn(e.trim(), p) },
      signUp: (n, e, p, d) => { marcarAtividade(true); return adapter.auth.signUp(n.trim(), e.trim(), p, d) },
      signOut: () => adapter.auth.signOut(),
      resetPassword: e => adapter.auth.resetPassword(e.trim()),
      updatePassword: (n, a) => adapter.auth.updatePassword(n, a),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  leitor: 'Leitor',
}

/** Equipe da biblioteca: acessa o painel administrativo. */
export const isEquipe = (r?: Role | null) => r === 'admin' || r === 'professor'
/** Administração (balcão da biblioteca): acervo, empréstimos, computadores, configurações. */
export const isBalcao = (r?: Role | null) => r === 'admin'

import { createClient, type EmailOtpType } from '@supabase/supabase-js'
import type { DataAdapter } from './adapter'
import type { Profile, SessionUser } from './types'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

/** Endereço do site sem parâmetros (os links dos e-mails voltam para cá). */
const siteUrl = () => window.location.origin + window.location.pathname

export function createSupabaseAdapter(): DataAdapter {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    // PKCE: links de e-mail voltam com ?code= ou ?token_hash= (compatível com rotas em #/)
    auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true },
  })
  let recuperando = false
  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') recuperando = true })

  return {
    async list(table) {
      const all: unknown[] = []
      const size = 1000
      for (let from = 0; ; from += size) {
        const { data, error } = await sb.from(table).select('*').range(from, from + size - 1)
        if (error) throw new Error(traduzErro(error.message))
        all.push(...(data ?? []))
        if (!data || data.length < size) break
      }
      return all as never
    },
    async insert(table, row) {
      // Sem `.select()`: quem insere nem sempre pode ler a tabela (ex.: inscrição do leitor).
      const { error } = await sb.from(table).insert(row as never)
      if (error) throw new Error(traduzErro(error.message))
    },
    async update(table, id, patch) {
      const { error } = await sb.from(table).update(patch as never).eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) throw new Error(traduzErro(error.message))
    },
    async rpc(fn, args) {
      const { data, error } = await sb.rpc(fn, args ?? {})
      if (error) throw new Error(traduzErro(error.message))
      return data as never
    },
    auth: {
      async current(): Promise<SessionUser | null> {
        const { data } = await sb.auth.getSession()
        const user = data.session?.user
        if (!user) return null
        const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle<Profile>()
        return {
          id: user.id,
          email: user.email ?? '',
          nome: prof?.nome || (user.user_metadata?.nome as string) || user.email || 'Usuário',
          role: prof?.role ?? 'leitor',
          membro_id: prof?.membro_id ?? null,
        }
      },
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw new Error(traduzErro(error.message))
      },
      async signUp(nome, email, password, nascimento) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { nome, data_nascimento: nascimento }, emailRedirectTo: siteUrl() },
        })
        if (error) throw new Error(traduzErro(error.message))
        return { needsConfirmation: !data.session }
      },
      async signOut() {
        await sb.auth.signOut()
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl() })
        if (error) throw new Error(traduzErro(error.message))
      },
      async updatePassword(nova, atual) {
        if (atual !== null) {
          const { data } = await sb.auth.getUser()
          const email = data.user?.email
          if (!email) throw new Error('Sessão expirada. Entre novamente.')
          const { error: e1 } = await sb.auth.signInWithPassword({ email, password: atual })
          if (e1) throw new Error('A senha atual está incorreta.')
        }
        const { error } = await sb.auth.updateUser({ password: nova })
        if (error) throw new Error(traduzErro(error.message))
        recuperando = false
      },
      async consumirLinkEmail() {
        const url = new URL(window.location.href)
        const tokenHash = url.searchParams.get('token_hash')
        const tipo = url.searchParams.get('type') as EmailOtpType | null
        const temCodigo = url.searchParams.has('code')
        const erroUrl = url.searchParams.get('error_description')
        if (!tokenHash && !temCodigo && !erroUrl) return null
        let retorno: 'confirmado' | 'recuperacao' | 'erro' = 'confirmado'
        if (erroUrl) retorno = 'erro'
        else if (tokenHash && tipo) {
          // Link no formato recomendado (funciona mesmo abrindo o e-mail em outro aparelho)
          const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
          retorno = error ? 'erro' : tipo === 'recovery' ? 'recuperacao' : 'confirmado'
        } else {
          // ?code= é trocado automaticamente pela biblioteca; aguarda um instante
          await sb.auth.getSession()
          await new Promise(r => setTimeout(r, 300))
          retorno = recuperando ? 'recuperacao' : 'confirmado'
        }
        // limpa o endereço (remove tokens da barra e do histórico)
        window.history.replaceState(null, '', siteUrl() + window.location.hash)
        return retorno
      },
      onChange(cb) {
        // setTimeout evita chamar o Supabase de dentro do callback (recomendação da lib)
        const { data } = sb.auth.onAuthStateChange(() => setTimeout(cb, 0))
        return () => data.subscription.unsubscribe()
      },
    },
  }
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada e o spam).'
  if (m.includes('already registered')) return 'Este e-mail já possui cadastro. Use "Entrar" ou "Esqueci minha senha".'
  if (m.includes('password should be') || m.includes('weak')) return 'Senha fraca: use pelo menos 8 caracteres, misturando letras e números.'
  if (m.includes('same_password') || m.includes('should be different')) return 'A nova senha deve ser diferente da atual.'
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (m.includes('row-level security') || m.includes('permission denied')) return 'Você não tem permissão para esta ação.'
  if (m.includes('duplicate key') && m.includes('inscricoes')) return 'Você já tem uma inscrição nesta turma.'
  if (m.includes('jwt expired')) return 'Sua sessão expirou. Entre novamente.'
  return msg
}

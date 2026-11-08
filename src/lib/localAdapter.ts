// Adaptador do MODO DEMONSTRAÇÃO: guarda tudo no localStorage do navegador.
// Reproduz, de forma simplificada, as regras e funções do banco (supabase/schema.sql).
import type { DataAdapter, RpcName } from './adapter'
import type { Inscricao, Membro, Profile, SessionUser, TableName, Tables } from './types'
import { buildSeed } from './seed'
import { DIAS_LONGOS, diffDays, fmtDate, hhmm, idade, today } from './dates'
import { digits, uid } from './utils'

const KEY = 'bd-sobralia-demo-v3'
const SESSION_KEY = 'bd-sobralia-demo-sessao'

type Store = ReturnType<typeof buildSeed>

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignora */ }
  const s = buildSeed()
  recompute(s)
  save(s)
  return s
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* armazenamento cheio/bloqueado */ }
}

function recompute(s: Store) {
  for (const l of s.livros) l.emprestados = s.emprestimos.filter(e => e.livro_id === l.id && !e.data_devolucao).length
  for (const t of s.turmas) t.matriculados = s.matriculas.filter(m => m.turma_id === t.id && m.status === 'ativa').length
}

export function resetDemo() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(SESSION_KEY)
}

const delay = <T,>(v: T) => new Promise<T>(r => setTimeout(() => r(v), 60))
const agora = () => new Date().toISOString()

export function createLocalAdapter(): DataAdapter {
  let store = load()
  const listeners = new Set<() => void>()
  const tbl = <K extends TableName>(t: K) => store[t] as unknown as Tables[K][]

  const perfil = (): Profile | null => store.profiles.find(x => x.id === localStorage.getItem(SESSION_KEY)) ?? null
  const sessionUser = (): SessionUser | null => {
    const p = perfil()
    return p ? { id: p.id, email: p.email, nome: p.nome ?? p.email, role: p.role, membro_id: p.membro_id } : null
  }
  const eAluno = (mid: string) => store.matriculas.some(m => m.membro_id === mid) || store.inscricoes.some(i => i.membro_id === mid)
  const veMembro = (mid: string) => { const u = sessionUser(); return u?.role === 'admin' || (u?.role === 'professor' && eAluno(mid)) }

  const proximaCarteirinha = () => String(store.membros.reduce((m, x) => Math.max(m, Number(x.carteirinha) || 0), 0) + 1).padStart(6, '0')

  // ---- equivalentes às funções do banco ----
  const enfileirarEmail = (para: string | null | undefined, nome: string, assunto: string) => {
    if (!para) return
    store.fila_emails.push({ id: Date.now() + Math.random(), para, nome, assunto, html: '', status: 'pendente', tentativas: 0, erro: null, created_at: agora(), enviado_em: null })
  }
  const criarMensagem = (membroId: string, assunto: string, corpo: string, tipo: Tables['mensagens']['tipo'], porEmail: boolean) => {
    const m = store.membros.find(x => x.id === membroId)
    if (!m) return
    const p = perfil()
    store.mensagens.push({ id: uid(), membro_id: membroId, remetente_id: p?.id ?? null, remetente_nome: tipo === 'atraso' ? null : p?.nome ?? null, assunto, corpo, tipo, por_email: porEmail, lida_em: null, created_at: agora() })
    if (porEmail) enfileirarEmail(m.email ?? store.profiles.find(x => x.membro_id === m.id)?.email, m.nome, assunto)
  }
  const notificarAtrasos = () => {
    let n = 0
    for (const e of store.emprestimos) {
      if (e.data_devolucao || e.data_prevista >= today()) continue
      if (e.ultimo_aviso_em && Date.now() - new Date(e.ultimo_aviso_em).getTime() < 3 * 86_400_000) continue
      const l = store.livros.find(x => x.id === e.livro_id)
      criarMensagem(e.membro_id, 'Livro com devolução atrasada',
        `O livro "${l?.titulo}" deveria ter sido devolvido em ${fmtDate(e.data_prevista)} (${diffDays(e.data_prevista, today())} dia(s) de atraso).\n\nPor favor, devolva o livro na biblioteca ou peça a renovação no balcão. Obrigado!`, 'atraso', true)
      e.ultimo_aviso_em = agora()
      n++
    }
    return n
  }
  // rotina diária (no Supabase roda às 9h pelo agendador do banco)
  try {
    if (localStorage.getItem('bd-demo-rotina') !== today()) {
      notificarAtrasos(); save(store); localStorage.setItem('bd-demo-rotina', today())
    }
  } catch { /* ignora */ }

  const exigir = (cond: boolean, msg = 'Sem permissão') => { if (!cond) throw new Error(msg) }

  const rpcs: Record<RpcName, (a: Record<string, unknown>) => unknown> = {
    aprovar_inscricao: ({ p_id }) => {
      exigir(['admin', 'professor'].includes(sessionUser()?.role ?? ''))
      const i = store.inscricoes.find(x => x.id === p_id)
      exigir(i?.status === 'pendente', 'Inscrição não está pendente')
      const t = store.turmas.find(x => x.id === i!.turma_id)!
      exigir(t.matriculados < t.vagas, 'A turma está cheia')
      const mat = store.matriculas.find(m => m.turma_id === t.id && m.membro_id === i!.membro_id)
      if (mat) mat.status = 'ativa'
      else store.matriculas.push({ id: uid(), turma_id: t.id, membro_id: i!.membro_id, status: 'ativa', created_at: agora() })
      Object.assign(i!, { status: 'aprovada', avaliado_por: perfil()?.id, avaliado_em: agora() })
      const m = store.membros.find(x => x.id === i!.membro_id)!
      if (i!.menor) { m.responsavel_nome ??= i!.responsavel_nome; m.responsavel_telefone ??= i!.responsavel_telefone }
      const c = store.cursos.find(x => x.id === t.curso_id)
      criarMensagem(m.id, `Inscrição aprovada: ${c?.nome}`,
        `Sua inscrição no curso ${c?.nome} foi aprovada! 🎉\n\nTurma: ${t.nome}\nDias: ${t.dias_semana.map(d => DIAS_LONGOS[d].replace('-feira', '')).join(', ')}\nHorário: ${hhmm(t.hora_inicio)} às ${hhmm(t.hora_fim)}\n${t.sala ? `Local: ${t.sala}\n` : ''}${t.professor ? `Professor: ${t.professor}\n` : ''}${t.data_inicio ? `Início: ${fmtDate(t.data_inicio)}\n` : ''}\nChegue alguns minutos antes da primeira aula. Até lá!`,
        'inscricao', true)
      return 'ok'
    },
    recusar_inscricao: ({ p_id, p_motivo }) => {
      exigir(['admin', 'professor'].includes(sessionUser()?.role ?? ''))
      const i = store.inscricoes.find(x => x.id === p_id)
      exigir(i?.status === 'pendente', 'Inscrição não está pendente')
      Object.assign(i!, { status: 'recusada', motivo_recusa: p_motivo || null, avaliado_por: perfil()?.id, avaliado_em: agora() })
      const c = store.cursos.find(x => x.id === store.turmas.find(t => t.id === i!.turma_id)?.curso_id)
      criarMensagem(i!.membro_id, `Sobre sua inscrição: ${c?.nome}`, `Não foi possível confirmar sua inscrição no curso ${c?.nome}.${p_motivo ? `\n\nMotivo: ${p_motivo}` : ''}\n\nProcure a biblioteca se tiver dúvidas.`, 'inscricao', true)
      return 'ok'
    },
    cancelar_minha_inscricao: ({ p_id }) => {
      const i = store.inscricoes.find(x => x.id === p_id && x.membro_id === sessionUser()?.membro_id && x.status === 'pendente')
      if (i) i.status = 'cancelada'
    },
    atualizar_meu_contato: ({ p_telefone, p_whatsapp }) => {
      const m = store.membros.find(x => x.id === sessionUser()?.membro_id)
      exigir(!!m, 'Conta sem carteirinha')
      const tel = digits(p_telefone as string) || null
      exigir(!tel || (tel.length >= 10 && tel.length <= 11), 'Telefone inválido: use DDD + número')
      m!.telefone = tel
      m!.telefone_whatsapp = !!p_whatsapp && !!tel
    },
    marcar_mensagem_lida: ({ p_id }) => {
      const msg = store.mensagens.find(x => x.id === p_id && x.membro_id === sessionUser()?.membro_id)
      if (msg && !msg.lida_em) msg.lida_em = agora()
    },
    enviar_mensagem: ({ p_membros, p_assunto, p_corpo, p_email }) => {
      exigir(['admin', 'professor'].includes(sessionUser()?.role ?? ''))
      exigir(!!String(p_assunto ?? '').trim() && !!String(p_corpo ?? '').trim(), 'Preencha assunto e mensagem')
      let n = 0
      for (const mid of p_membros as string[]) {
        if (!veMembro(mid)) continue
        criarMensagem(mid, String(p_assunto), String(p_corpo), 'mensagem', !!p_email)
        n++
      }
      return n
    },
    email_configurado: () => false,
    enviar_email_teste: () => 'Modo demonstração: nenhum e-mail é enviado de verdade.',
  }

  // Regras de leitura (equivalentes ao RLS do banco)
  const filtrar = (t: TableName, rows: unknown[]): unknown[] => {
    const u = sessionUser()
    const publicas: TableName[] = ['livros', 'cursos', 'turmas', 'computadores', 'configuracoes']
    if (publicas.includes(t)) return rows
    if (!u) return []
    const mid = u.membro_id
    const proprios = (r: unknown) => (r as { membro_id: string }).membro_id === mid
    if (u.role === 'admin') return rows
    if (u.role === 'professor') {
      if (['emprestimos', 'usos_computador', 'fila_emails'].includes(t)) return []
      if (t === 'membros') return (rows as Membro[]).filter(m => eAluno(m.id) || m.id === mid)
      if (t === 'profiles') return (rows as Profile[]).filter(r => r.id === u.id)
      if (t === 'mensagens') return (rows as Tables['mensagens'][]).filter(r => r.remetente_id === u.id || r.membro_id === mid)
      return rows
    }
    // leitor
    if (t === 'membros') return (rows as Membro[]).filter(r => r.id === mid)
    if (t === 'profiles') return (rows as Profile[]).filter(r => r.id === u.id)
    if (['emprestimos', 'matriculas', 'frequencias', 'inscricoes', 'mensagens'].includes(t)) return rows.filter(proprios)
    return []
  }

  const notificar = () => listeners.forEach(l => l())

  return {
    async list(t) {
      store = load()
      return delay(structuredClone(filtrar(t, tbl(t) as unknown[])) as never)
    },
    async insert(t, row) {
      const r = { created_at: agora(), ...row } as Record<string, unknown>
      const u = sessionUser()
      if (t === 'membros' && !r.carteirinha) r.carteirinha = proximaCarteirinha()
      if (t === 'inscricoes' && u?.role === 'leitor') {
        const i = r as unknown as Inscricao
        exigir(i.membro_id === u.membro_id, 'Inscrição permitida apenas para o próprio cadastro')
        exigir(!store.inscricoes.some(x => x.turma_id === i.turma_id && x.membro_id === i.membro_id && ['pendente', 'aprovada'].includes(x.status)), 'Você já tem uma inscrição nesta turma.')
        const m = store.membros.find(x => x.id === i.membro_id)
        i.menor = (idade(m?.data_nascimento ?? null) ?? 0) < 18
        exigir(!i.menor || (!!i.responsavel_nome && !!i.assinatura), 'Para menores de 18 anos é obrigatório o termo assinado pelo responsável')
        Object.assign(i, { status: 'pendente', termo_aceito_em: i.menor ? agora() : null, assinatura: i.menor ? i.assinatura : null })
      }
      ;(tbl(t) as unknown[]).push(r)
      recompute(store); save(store)
      await delay(null)
    },
    async update(t, id, patch) {
      const r = (tbl(t) as { id: unknown }[]).find(x => x.id === id)
      if (!r) throw new Error('Registro não encontrado')
      Object.assign(r, patch)
      recompute(store); save(store)
      await delay(null)
    },
    async remove(t, id) {
      const arr = tbl(t) as { id: unknown }[]
      const i = arr.findIndex(x => x.id === id)
      if (i >= 0) arr.splice(i, 1)
      recompute(store); save(store)
      await delay(null)
    },
    async rpc(fn, args) {
      store = load()
      const out = rpcs[fn](args ?? {})
      recompute(store); save(store)
      return delay(out as never)
    },
    auth: {
      async current() { return delay(sessionUser()) },
      async signIn(email, password) {
        const e = email.trim().toLowerCase()
        const p = store.profiles.find(x => x.email.toLowerCase() === e)
        if (!p || store.senhas[p.email] !== password) throw new Error('E-mail ou senha incorretos.')
        localStorage.setItem(SESSION_KEY, p.id)
        notificar()
      },
      async signUp(nome, email, password, nascimento) {
        const e = email.trim().toLowerCase()
        if (store.profiles.some(x => x.email.toLowerCase() === e)) throw new Error('Este e-mail já possui cadastro. Use "Entrar" ou "Esqueci minha senha".')
        if (password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.')
        // Autocadastro: vincula ao cadastro do balcão (mesmo e-mail) ou cria a carteirinha na hora
        let membro = store.membros.find(m => m.email?.toLowerCase() === e && !store.profiles.some(p => p.membro_id === m.id))
        if (!membro) {
          membro = { id: uid(), carteirinha: proximaCarteirinha(), nome, data_nascimento: nascimento, telefone: null, telefone_whatsapp: false,
            email: e, endereco: null, responsavel_nome: null, responsavel_telefone: null, observacoes: null, ativo: true, created_at: agora() }
          store.membros.push(membro)
        }
        const p: Profile = { id: uid(), email: e, nome, data_nascimento: nascimento, role: 'leitor', membro_id: membro.id, created_at: agora() }
        store.profiles.push(p)
        store.senhas[e] = password
        save(store)
        localStorage.setItem(SESSION_KEY, p.id)
        notificar()
        return { needsConfirmation: false }
      },
      async signOut() {
        localStorage.removeItem(SESSION_KEY)
        notificar()
      },
      async resetPassword() {
        await delay(null)
        throw new Error('No modo demonstração não há envio de e-mail. As contas de exemplo usam a senha demo123.')
      },
      async updatePassword(nova, atual) {
        const p = perfil()
        if (!p) throw new Error('Sessão expirada. Entre novamente.')
        if (atual !== null && store.senhas[p.email] !== atual) throw new Error('A senha atual está incorreta.')
        if (nova.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.')
        store.senhas[p.email] = nova
        save(store)
        await delay(null)
      },
      async consumirLinkEmail() { return null },
      onChange(cb) {
        listeners.add(cb)
        return () => { listeners.delete(cb) }
      },
    },
  }
}


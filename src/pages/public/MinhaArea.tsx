import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, GraduationCap, History, IdCard, KeyRound, LayoutDashboard, Lock, LogOut, Mail,
  MailOpen, MessageCircle, Phone, Printer, Save, UserRound,
} from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import { Carteirinha } from '../../components/Carteirinha'
import { Alert, Badge, Button, Card, EmptyState, Field, Input, SenhaInput, Spinner, Tabs, useFeedback } from '../../components/ui'
import { isEquipe, ROLE_LABEL, useAuth } from '../../lib/auth'
import { db, useConfig, useTable } from '../../lib/db'
import { DIAS_CURTOS, fmtDate, fmtDateTime, hhmm, idade, relativeDue } from '../../lib/dates'
import { podeRenovar, STATUS_INSCRICAO } from '../../lib/services'
import type { Membro, Mensagem } from '../../lib/types'
import { cn, digits, errMsg, fmtPhone } from '../../lib/utils'

type Aba = 'livros' | 'cursos' | 'mensagens' | 'dados' | 'carteirinha'

export default function MinhaArea() {
  const { user, ready, signOut } = useAuth()
  const [params, setParams] = useSearchParams()
  const { data: membros, loading } = useTable('membros')
  const { data: mensagens } = useTable('mensagens')
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) || 'livros')
  const abaUrl = params.get('aba') as Aba | null
  useEffect(() => { if (abaUrl) setAba(abaUrl) }, [abaUrl])

  if (!ready) return <Spinner className="py-40" />
  if (!user) return <Navigate to="/entrar" replace />

  const membro = membros.find(m => m.id === user.membro_id)
  const minhas = mensagens.filter(m => m.membro_id === user.membro_id)
  const naoLidas = minhas.filter(m => !m.lida_em).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-royal text-white"><UserRound className="size-7" /></div>
          <div>
            <p className="text-sm text-slate-500">Olá,</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">{user.nome.split(' ')[0]}! 👋</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="blue">{ROLE_LABEL[user.role]}</Badge>
              {membro && <Badge tone="green"><IdCard className="size-3" /> Carteirinha nº {membro.carteirinha}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEquipe(user.role) && <Link to="/admin"><Button icon={<LayoutDashboard className="size-4" />}>Painel</Button></Link>}
          <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={() => signOut()}>Sair</Button>
        </div>
      </div>

      {params.get('bemvindo') && membro && (
        <div className="mb-5">
          <Alert tone="success">
            <b>E-mail confirmado! Sua carteirinha nº {membro.carteirinha} está pronta.</b> Mostre o QR Code no balcão para pegar livros.
            <button className="ml-2 font-bold underline" onClick={() => { params.delete('bemvindo'); setParams(params, { replace: true }) }}>Ok</button>
          </Alert>
        </div>
      )}

      {loading ? <Spinner /> : !membro ? (
        <Card className="p-6">
          <Alert tone="info">
            <b>Esta conta ainda não tem carteirinha.</b><br />
            {isEquipe(user.role)
              ? 'Contas da equipe não precisam de carteirinha — use o painel administrativo.'
              : 'A carteirinha é criada assim que o e-mail é confirmado. Se você já confirmou, saia e entre novamente; se o problema continuar, procure a biblioteca.'}
          </Alert>
        </Card>
      ) : (
        <>
          <div className="mb-5">
            <Tabs value={aba} onChange={setAba} items={[
              { value: 'livros', label: <span className="flex items-center gap-1.5"><BookOpen className="size-4" />Livros</span> },
              { value: 'cursos', label: <span className="flex items-center gap-1.5"><GraduationCap className="size-4" />Cursos</span> },
              { value: 'mensagens', label: <span className="flex items-center gap-1.5"><Mail className="size-4" />Mensagens</span>, count: naoLidas || undefined },
              { value: 'dados', label: <span className="flex items-center gap-1.5"><UserRound className="size-4" />Meus dados</span> },
              { value: 'carteirinha', label: <span className="flex items-center gap-1.5"><IdCard className="size-4" />Carteirinha</span> },
            ]} />
          </div>
          {aba === 'livros' && <MeusLivros membroId={membro.id} />}
          {aba === 'cursos' && <MeusCursos membroId={membro.id} />}
          {aba === 'mensagens' && <MinhasMensagens mensagens={minhas} />}
          {aba === 'dados' && <MeusDados membro={membro} email={user.email} />}
          {aba === 'carteirinha' && (
            <Card className="flex flex-col items-center p-6">
              <div className="print-area"><Carteirinha membro={membro} /></div>
              <Button variant="ghost" size="sm" className="no-print mt-3" icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir</Button>
              <p className="mt-1 max-w-xs text-center text-xs text-slate-500">Mostre o QR Code no balcão para pegar livros e usar os computadores. Dica: tire um print da tela.</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function MeusLivros({ membroId }: { membroId: string }) {
  const cfg = useConfig()
  const { data: emprestimos } = useTable('emprestimos')
  const { data: livros } = useTable('livros')
  const meus = emprestimos.filter(e => e.membro_id === membroId)
  const ativos = meus.filter(e => !e.data_devolucao).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))
  const historico = meus.filter(e => e.data_devolucao).sort((a, b) => b.data_devolucao!.localeCompare(a.data_devolucao!))
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-extrabold text-navy"><BookOpen className="size-5 text-royal" /> Livros comigo</h2>
          <Badge tone="gray">{ativos.length} de {cfg.max_emprestimos}</Badge>
        </div>
        {ativos.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-7" />} title="Nenhum livro emprestado" text="Que tal escolher uma nova leitura?" action={<Link to="/acervo"><Button>Ver acervo</Button></Link>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ativos.map(e => {
              const l = livros.find(x => x.id === e.livro_id)
              const r = relativeDue(e.data_prevista)
              return (
                <li key={e.id} className="flex gap-4 px-5 py-4">
                  {l && <BookCover livro={l} size="sm" className="w-12 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy">{l?.titulo ?? 'Livro'}</p>
                    <p className="text-sm text-slate-500">{l?.autores}</p>
                    <p className="mt-1.5 text-sm text-slate-600">Devolver até <b>{fmtDate(e.data_prevista)}</b></p>
                    {!podeRenovar(e, cfg) && <p className="mt-1 text-xs text-slate-500">Precisa de mais tempo? Peça a renovação no balcão{cfg.telefone ? ` ou pelo telefone ${cfg.telefone}` : ''}.</p>}
                  </div>
                  <Badge tone={r.tone} className="self-start">{r.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      {historico.length > 0 && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-extrabold text-navy"><History className="size-5 text-royal" /> Histórico de leituras</h2></div>
          <ul className="divide-y divide-slate-100 text-sm">
            {historico.slice(0, 20).map(e => (
              <li key={e.id} className="flex justify-between gap-4 px-5 py-3">
                <span className="font-semibold text-slate-700">{livros.find(l => l.id === e.livro_id)?.titulo ?? 'Livro'}</span>
                <span className="whitespace-nowrap text-slate-500">{fmtDate(e.data_devolucao)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function MeusCursos({ membroId }: { membroId: string }) {
  const { toast, confirm } = useFeedback()
  const { data: matriculas } = useTable('matriculas')
  const { data: inscricoes } = useTable('inscricoes')
  const { data: turmas } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: freq } = useTable('frequencias')
  const minhas = matriculas.filter(m => m.membro_id === membroId && m.status === 'ativa')
  const pedidos = inscricoes.filter(i => i.membro_id === membroId && i.status !== 'aprovada').sort((a, b) => b.created_at.localeCompare(a.created_at))
  const nomeTurma = (id: string) => { const t = turmas.find(x => x.id === id); return `${cursos.find(c => c.id === t?.curso_id)?.nome ?? 'Curso'} — ${t?.nome ?? ''}` }

  const cancelar = async (id: string) => {
    if (!(await confirm({ title: 'Cancelar inscrição?', msg: 'Você pode se inscrever novamente depois, se ainda houver vagas.', danger: true, okLabel: 'Cancelar inscrição' }))) return
    try { await db.rpc('cancelar_minha_inscricao', { p_id: id }, ['inscricoes']); toast('Inscrição cancelada.') } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-extrabold text-navy"><GraduationCap className="size-5 text-royal" /> Minhas aulas</h2>
          <Link to="/cursos"><Button size="sm" variant="secondary">Ver cursos</Button></Link>
        </div>
        {minhas.length === 0 ? (
          <EmptyState icon={<GraduationCap className="size-7" />} title="Você ainda não está matriculado em nenhum curso" text="Escolha uma turma na página de cursos e faça sua inscrição." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {minhas.map(m => {
              const t = turmas.find(x => x.id === m.turma_id)
              const c = cursos.find(x => x.id === t?.curso_id)
              const fs = freq.filter(f => f.turma_id === m.turma_id && f.membro_id === m.membro_id)
              const pct = fs.length ? Math.round((fs.filter(f => f.presente).length / fs.length) * 100) : null
              if (!t) return null
              return (
                <div key={m.id} className="rounded-2xl bg-paper p-4 ring-1 ring-slate-200" style={{ borderLeft: `5px solid ${c?.cor ?? '#0339A6'}` }}>
                  <p className="font-bold text-navy">{c?.nome}</p>
                  <p className="text-sm text-slate-500">{t.nome}{t.professor && ` · ${t.professor}`}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-700"><CalendarDays className="size-4 text-royal" /> {t.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')}</p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-700"><Clock className="size-4 text-royal" /> {hhmm(t.hora_inicio)} às {hhmm(t.hora_fim)}{t.sala && ` · ${t.sala}`}</p>
                  {pct !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-semibold text-slate-500"><span>Frequência</span><span>{pct}%</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
      {pedidos.length > 0 && (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-navy">Minhas inscrições</h2></div>
          <ul className="divide-y divide-slate-100">
            {pedidos.map(i => {
              const st = STATUS_INSCRICAO[i.status]
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="font-semibold text-navy">{nomeTurma(i.turma_id)}</p>
                    <p className="text-xs text-slate-500">Enviada em {fmtDateTime(i.created_at)}{i.menor && ' · termo assinado pelo responsável'}</p>
                    {i.motivo_recusa && <p className="mt-1 text-sm text-red-600">Motivo: {i.motivo_recusa}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {i.status === 'pendente' && <Button size="sm" variant="ghost" onClick={() => cancelar(i.id)}>Cancelar</Button>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function MinhasMensagens({ mensagens }: { mensagens: Mensagem[] }) {
  const [aberta, setAberta] = useState<string | null>(null)
  const lista = [...mensagens].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const abrir = (m: Mensagem) => {
    setAberta(a => (a === m.id ? null : m.id))
    if (!m.lida_em) db.rpc('marcar_mensagem_lida', { p_id: m.id }, ['mensagens']).catch(() => {})
  }
  if (!lista.length) return <Card><EmptyState icon={<Mail className="size-7" />} title="Nenhuma mensagem" text="Avisos da biblioteca e dos professores aparecem aqui." /></Card>
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden">
      {lista.map(m => (
        <button key={m.id} onClick={() => abrir(m)} className={cn('block w-full px-5 py-4 text-left transition hover:bg-slate-50', !m.lida_em && 'bg-royal/[.04]')}>
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full', m.tipo === 'atraso' ? 'bg-red-100 text-red-600' : m.tipo === 'inscricao' ? 'bg-leaf/15 text-leaf-dark' : 'bg-royal/10 text-royal')}>
              {m.lida_em ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn('text-navy', !m.lida_em ? 'font-extrabold' : 'font-semibold')}>{m.assunto}</p>
                <span className="text-xs text-slate-400">{fmtDateTime(m.created_at)}</span>
              </div>
              <p className="text-xs text-slate-500">{m.remetente_nome ?? 'Biblioteca Digital'}{m.por_email && ' · também enviada por e-mail'}</p>
              <p className={cn('mt-2 whitespace-pre-line text-sm text-slate-600', aberta !== m.id && 'line-clamp-2')}>{m.corpo}</p>
            </div>
          </div>
        </button>
      ))}
    </Card>
  )
}

function MeusDados({ membro, email }: { membro: Membro; email: string }) {
  const { updatePassword } = useAuth()
  const { toast } = useFeedback()
  const [tel, setTel] = useState(fmtPhone(membro.telefone))
  const [whats, setWhats] = useState(membro.telefone_whatsapp)
  const [salvando, setSalvando] = useState(false)
  const [erroTel, setErroTel] = useState<string | null>(null)
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [nova2, setNova2] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [trocando, setTrocando] = useState(false)
  useEffect(() => { setTel(fmtPhone(membro.telefone)); setWhats(membro.telefone_whatsapp) }, [membro.telefone, membro.telefone_whatsapp])

  const salvarContato = async () => {
    setErroTel(null)
    const d = digits(tel)
    if (d && (d.length < 10 || d.length > 11)) return setErroTel('Informe o DDD + número (ex.: 33 99999-9999).')
    setSalvando(true)
    try {
      await db.rpc('atualizar_meu_contato', { p_telefone: d || null, p_whatsapp: !!d && whats }, ['membros'])
      toast('Contato atualizado!')
    } catch (e) { setErroTel(errMsg(e)) } finally { setSalvando(false) }
  }

  const trocarSenha = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setErroSenha(null)
    if (nova.length < 8) return setErroSenha('A nova senha deve ter pelo menos 8 caracteres.')
    if (nova !== nova2) return setErroSenha('As senhas novas não conferem.')
    setTrocando(true)
    try { await updatePassword(nova, atual); toast('Senha alterada!'); setAtual(''); setNova(''); setNova2('') }
    catch (err) { setErroSenha(errMsg(err)) } finally { setTrocando(false) }
  }

  const fixos: [string, string][] = [
    ['Nome', membro.nome],
    ['Data de nascimento', membro.data_nascimento ? `${fmtDate(membro.data_nascimento)} (${idade(membro.data_nascimento)} anos)` : '—'],
    ['E-mail', email],
    ['Carteirinha', `nº ${membro.carteirinha}`],
    ...(membro.responsavel_nome ? [['Responsável', membro.responsavel_nome] as [string, string]] : []),
  ]
  const contatoMudou = digits(tel) !== (membro.telefone ?? '') || whats !== membro.telefone_whatsapp

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold text-navy"><UserRound className="size-5 text-royal" /> Meus dados</h2>
        <dl className="mt-4 space-y-3">
          {fixos.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="truncate font-semibold text-slate-700">{v}</dd>
              </div>
              <Lock className="size-4 shrink-0 text-slate-300" aria-label="Não editável" />
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">Para corrigir nome, data de nascimento ou e-mail, procure a biblioteca com um documento.</p>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="flex items-center gap-2 font-bold text-navy"><Phone className="size-4 text-royal" /> Telefone (opcional)</h3>
          <div className="mt-3 space-y-3">
            <Input value={tel} onChange={e => setTel(e.target.value)} onBlur={() => setTel(fmtPhone(tel))} inputMode="tel" placeholder="(33) 9 9999-9999" maxLength={16} />
            <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition', whats ? 'bg-lime-50 ring-lime-200' : 'ring-slate-200', !digits(tel) && 'pointer-events-none opacity-50')}>
              <input type="checkbox" checked={whats && !!digits(tel)} onChange={e => setWhats(e.target.checked)} className="size-5 accent-leaf" />
              <MessageCircle className="size-5 text-leaf-dark" />
              <span className="text-sm font-semibold text-slate-700">Este número tem WhatsApp<span className="block text-xs font-normal text-slate-500">A biblioteca poderá enviar lembretes por lá.</span></span>
            </label>
            {erroTel && <Alert tone="error">{erroTel}</Alert>}
            <Button onClick={salvarContato} loading={salvando} disabled={!contatoMudou} icon={<Save className="size-4" />}>Salvar contato</Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-extrabold text-navy"><KeyRound className="size-5 text-royal" /> Trocar senha</h2>
        <form onSubmit={trocarSenha} className="mt-4 space-y-4">
          <Field label="Senha atual"><SenhaInput value={atual} onChange={setAtual} autoComplete="current-password" /></Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres"><SenhaInput value={nova} onChange={setNova} autoComplete="new-password" minLength={8} /></Field>
          <Field label="Repita a nova senha"><SenhaInput value={nova2} onChange={setNova2} autoComplete="new-password" minLength={8} /></Field>
          {erroSenha && <Alert tone="error">{erroSenha}</Alert>}
          <Button type="submit" loading={trocando} icon={<CheckCircle2 className="size-4" />}>Alterar senha</Button>
        </form>
      </Card>
    </div>
  )
}


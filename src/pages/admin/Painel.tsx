import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeftRight, ArrowRight, BookCopy, CalendarDays, Check, GraduationCap, Mail, MessageCircle, Monitor, ScanLine,
  UserPlus, Users,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, PageHeader, Stat, useFeedback } from '../../components/ui'
import { isBalcao, useAuth } from '../../lib/auth'
import { db, useConfig, useTable } from '../../lib/db'
import { DIAS_LONGOS, addDays, fmtDate, fmtDateLong, fmtDateTime, hhmm, MESES_CURTOS, today } from '../../lib/dates'
import { atrasado, diasAtraso } from '../../lib/services'
import type { Emprestimo } from '../../lib/types'
import { cn, errMsg, fmtPhone, whatsappLink } from '../../lib/utils'

export default function Painel() {
  const { user } = useAuth()
  const balcao = isBalcao(user?.role)
  const { data: livros } = useTable('livros')
  const { data: emps } = useTable('emprestimos')
  const { data: turmas } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: pcs } = useTable('computadores')
  const { data: insc } = useTable('inscricoes')
  const { data: matriculas } = useTable('matriculas')

  const ativos = emps.filter(e => !e.data_devolucao)
  const atrasados = ativos.filter(atrasado).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))
  const exemplares = livros.reduce((s, l) => s + l.quantidade, 0)
  const hoje = new Date().getDay()
  const aulasHoje = turmas.filter(t => t.status !== 'encerrada' && t.dias_semana.includes(hoje) && (!t.data_inicio || t.data_inicio <= today()) && (!t.data_fim || t.data_fim >= today()))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  const turmasAtivas = turmas.filter(t => t.status !== 'encerrada').length
  const alunos = new Set(matriculas.filter(m => m.status === 'ativa').map(m => m.membro_id)).size
  const pendentes = insc.filter(p => p.status === 'pendente')

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MESES_CURTOS[d.getMonth()], n: emps.filter(e => e.data_emprestimo.startsWith(key)).length }
  })
  const maxMes = Math.max(1, ...meses.map(m => m.n))
  const cont = new Map<string, number>()
  emps.forEach(e => cont.set(e.livro_id, (cont.get(e.livro_id) ?? 0) + 1))
  const top = [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <>
      <PageHeader
        title={`${saudacao()}${user ? ', ' + primeiroNome(user.nome) : ''}!`}
        subtitle={fmtDateLong(today())}
        actions={balcao && <>
          <Link to="/admin/livros?novo=scan"><Button variant="secondary" icon={<ScanLine className="size-4" />}>Cadastrar livro</Button></Link>
          <Link to="/admin/emprestimos?novo=1"><Button icon={<ArrowLeftRight className="size-4" />}>Novo empréstimo</Button></Link>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {balcao ? <>
          <Stat to="/admin/livros" label="Livros no acervo" value={exemplares} hint={`${livros.length} títulos`} icon={<BookCopy className="size-5" />} />
          <Stat to="/admin/emprestimos?aba=ativos" label="Emprestados agora" value={ativos.length} icon={<ArrowLeftRight className="size-5" />} tone="violet" />
          <Stat to="/admin/emprestimos?aba=atrasados" label="Devoluções atrasadas" value={atrasados.length} icon={<AlertTriangle className="size-5" />} tone={atrasados.length ? 'red' : 'green'} />
          <Stat to="/admin/computadores" label="Computadores em uso" value={`${pcs.filter(p => p.status === 'em_uso').length}/${pcs.length}`} icon={<Monitor className="size-5" />} tone="amber" />
        </> : <>
          <Stat to="/admin/cursos" label="Turmas ativas" value={turmasAtivas} icon={<GraduationCap className="size-5" />} />
          <Stat to="/admin/cursos?aba=grade" label="Aulas hoje" value={aulasHoje.length} icon={<CalendarDays className="size-5" />} tone="violet" />
          <Stat to="/admin/cursos?aba=pre" label="Inscrições aguardando" value={pendentes.length} icon={<UserPlus className="size-5" />} tone="green" />
          <Stat to="/admin/pessoas" label="Alunos matriculados" value={alunos} icon={<Users className="size-5" />} tone="amber" />
        </>}
      </div>

      {pendentes.length > 0 && (
        <Link to="/admin/cursos?aba=pre" className="mt-4 flex items-center gap-3 rounded-2xl bg-leaf/10 p-4 ring-1 ring-leaf/30 transition hover:bg-leaf/15">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf text-white"><UserPlus className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-navy">{pendentes.length} inscrição(ões) em curso aguardando análise</p>
            <p className="text-sm text-slate-600">Confira o termo assinado (menores) e aprove — o aluno recebe as informações das aulas por e-mail.</p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-leaf-dark" />
        </Link>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {balcao && <CentralAvisos atrasados={atrasados} />}

        <Card className={cn(!balcao && 'xl:col-span-2')}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-extrabold text-navy"><CalendarDays className="size-5 text-royal" /> Aulas de hoje</h2>
            <span className="text-sm text-slate-500">{DIAS_LONGOS[hoje]}</span>
          </div>
          {aulasHoje.length === 0 ? (
            <EmptyState icon={<CalendarDays className="size-7" />} title="Sem aulas hoje" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {aulasHoje.map(t => {
                const c = cursos.find(c => c.id === t.curso_id)
                return (
                  <li key={t.id}>
                    <Link to={`/admin/turmas/${t.id}?aba=chamada`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                      <div className="w-14 text-center">
                        <p className="font-extrabold text-royal">{hhmm(t.hora_inicio)}</p>
                        <p className="text-xs text-slate-400">{hhmm(t.hora_fim)}</p>
                      </div>
                      <div className="h-10 w-1 rounded-full" style={{ background: c?.cor ?? '#0339A6' }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy">{c?.nome}</p>
                        <p className="text-sm text-slate-500">{t.nome} · {t.matriculados} aluno(s)</p>
                      </div>
                      <span className="hidden text-sm font-bold text-royal sm:block">Fazer chamada</span>
                      <ArrowRight className="size-4 text-slate-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {balcao && (
          <Card className="p-5">
            <h2 className="font-extrabold text-navy">Empréstimos por mês</h2>
            <div className="mt-6 flex h-44 items-end gap-3">
              {meses.map((m, i) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{m.n}</span>
                  <div className={cn('w-full rounded-t-lg transition-all', i === 5 ? 'bg-royal' : 'bg-royal/25')} style={{ height: `${(m.n / maxMes) * 100}%`, minHeight: 4 }} />
                  <span className="text-xs font-semibold uppercase text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {balcao && (
          <Card>
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-navy">Livros mais procurados</h2></div>
            <ol className="divide-y divide-slate-100">
              {top.map(([id, n], i) => (
                <li key={id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn('grid size-7 place-items-center rounded-full text-xs font-extrabold', i === 0 ? 'bg-leaf text-white' : 'bg-slate-100 text-slate-500')}>{i + 1}</span>
                  <span className="flex-1 truncate font-semibold text-slate-700">{livros.find(l => l.id === id)?.titulo ?? '—'}</span>
                  <span className="text-sm text-slate-500">{n}×</span>
                </li>
              ))}
              {top.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">Ainda sem empréstimos.</li>}
            </ol>
          </Card>
        )}
      </div>
    </>
  )
}

/**
 * Central de avisos de atraso.
 * E-mail: automático (rotina diária do banco). WhatsApp: um clique com a mensagem pronta
 * (o envio 100% automático pelo WhatsApp só existe na API paga do Meta).
 */
function CentralAvisos({ atrasados }: { atrasados: Emprestimo[] }) {
  const cfg = useConfig()
  const { toast } = useFeedback()
  const { data: membros } = useTable('membros')
  const { data: livros } = useTable('livros')
  const limite = addDays(today(), -3)
  const pendenteWhats = (e: Emprestimo) => !e.whatsapp_avisado_em || e.whatsapp_avisado_em.slice(0, 10) < limite

  const marcar = async (e: Emprestimo) => {
    try { await db.update('emprestimos', e.id, { whatsapp_avisado_em: new Date().toISOString() }) } catch (err) { toast(errMsg(err), 'error') }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-extrabold text-navy"><AlertTriangle className="size-5 text-red-500" /> Central de avisos de atraso</h2>
        <Link to="/admin/emprestimos?aba=atrasados" className="text-sm font-bold text-royal hover:underline">Ver todos</Link>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Mail className="size-3.5" /> E-mail automático todo dia às 9h (repete a cada 3 dias)</span>
        <span className="flex items-center gap-1"><MessageCircle className="size-3.5 text-leaf-dark" /> WhatsApp: um clique, mensagem pronta</span>
      </p>
      {atrasados.length === 0 ? (
        <EmptyState icon={<Check className="size-7" />} title="Nenhum atraso 🎉" text="Todas as devoluções estão em dia." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {atrasados.slice(0, 8).map(e => {
            const m = membros.find(x => x.id === e.membro_id)
            const l = livros.find(x => x.id === e.livro_id)
            const tel = m?.telefone || m?.responsavel_telefone
            const contato = (m?.responsavel_nome ?? m?.nome ?? '').split(' ')[0]
            const wa = whatsappLink(tel, `Olá, ${contato}! Aqui é da ${cfg.nome_biblioteca}. O livro "${l?.titulo}"${m?.responsavel_nome ? ` emprestado para ${m.nome.split(' ')[0]}` : ''} deveria ter sido devolvido em ${fmtDate(e.data_prevista)}. Pode devolver ou pedir a renovação? Obrigado!`)
            const precisa = pendenteWhats(e)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy">{l?.titulo}</p>
                  <p className="truncate text-sm text-slate-500">{m?.nome} · venceu {fmtDate(e.data_prevista)}</p>
                  <p className="text-xs text-slate-400">
                    {e.ultimo_aviso_em ? `E-mail/mensagem: ${fmtDateTime(e.ultimo_aviso_em)}` : 'Aviso automático pendente'}
                    {e.whatsapp_avisado_em && ` · WhatsApp: ${fmtDate(e.whatsapp_avisado_em.slice(0, 10))}`}
                  </p>
                </div>
                <Badge tone="red">{diasAtraso(e)}d</Badge>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" onClick={() => marcar(e)}
                    className={cn('inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition',
                      precisa ? 'bg-leaf text-white hover:bg-leaf-dark' : 'bg-lime-50 text-leaf-dark ring-1 ring-lime-200')}
                    title={m?.telefone_whatsapp ? 'Número com WhatsApp' : `Telefone ${fmtPhone(tel)} (WhatsApp não confirmado)`}>
                    <MessageCircle className="size-4" /> {precisa ? 'Avisar' : 'Avisado'}
                  </a>
                ) : <span className="text-xs text-slate-400">sem telefone</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function primeiroNome(n: string) {
  return n.split(/\s+/).find(p => !p.endsWith('.')) ?? n
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

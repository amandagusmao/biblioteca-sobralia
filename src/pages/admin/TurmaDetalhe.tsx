import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, ClipboardCheck, Clock, MapPin, Pencil, Plus, Printer, Star, Trash2, User, UserMinus, UserPlus, Users, X } from 'lucide-react'
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, SearchSelect, Spinner, Tabs, Textarea, useFeedback,
} from '../../components/ui'
import { db, useTable } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { DIAS_CURTOS, DIAS_LONGOS, fmtDate, hhmm, idade, parseDate, today } from '../../lib/dates'
import { ESCALA, STATUS_TURMA, vagasRestantes } from '../../lib/services'
import type { Turma } from '../../lib/types'
import { cn, errMsg, fmtPhone } from '../../lib/utils'
import { TurmaForm } from './Cursos'
import { PessoaForm } from './Pessoas'

type Aba = 'alunos' | 'chamada' | 'frequencia' | 'desempenho'

export default function TurmaDetalhe() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { toast, confirm } = useFeedback()
  const { data: turmas, loading } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: mats } = useTable('matriculas')
  const { data: membros } = useTable('membros')
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) || 'alunos')
  const [editar, setEditar] = useState<Partial<Turma> | null>(null)
  const [novoAluno, setNovoAluno] = useState<string | null>(null)
  const [cadastrar, setCadastrar] = useState<object | null>(null)

  const turma = turmas.find(t => t.id === id)
  const curso = cursos.find(c => c.id === turma?.curso_id)
  const matriculas = mats.filter(m => m.turma_id === id)
  const ativos = matriculas.filter(m => m.status === 'ativa')
    .map(m => ({ m, p: membros.find(x => x.id === m.membro_id) }))
    .filter(x => x.p).sort((a, b) => a.p!.nome.localeCompare(b.p!.nome, 'pt-BR'))

  if (loading) return <Spinner />
  if (!turma) return <EmptyState icon={<Users className="size-7" />} title="Turma não encontrada" action={<Link to="/admin/cursos"><Button>Voltar</Button></Link>} />

  const matricular = async (membroId: string) => {
    if (matriculas.some(m => m.membro_id === membroId && m.status === 'ativa')) { toast('Esta pessoa já está matriculada.', 'info'); return }
    if (vagasRestantes(turma) <= 0 && !(await confirm({ title: 'Turma cheia', msg: 'Todas as vagas estão preenchidas. Matricular mesmo assim?', okLabel: 'Matricular' }))) return
    try {
      const antiga = matriculas.find(m => m.membro_id === membroId)
      if (antiga) await db.update('matriculas', antiga.id, { status: 'ativa' })
      else await db.insert('matriculas', { turma_id: turma.id, membro_id: membroId, status: 'ativa', created_at: new Date().toISOString() })
      setNovoAluno(null)
      toast('Aluno matriculado!')
    } catch (e) { toast(errMsg(e), 'error') }
  }

  const removerMatricula = async (mid: string, nome: string) => {
    if (!(await confirm({ title: 'Cancelar matrícula?', msg: <>{nome} deixará de fazer parte da turma. O histórico de frequência é mantido.</>, danger: true, okLabel: 'Cancelar matrícula' }))) return
    await db.update('matriculas', mid, { status: 'cancelada' })
    toast('Matrícula cancelada.')
  }

  const excluirTurma = async () => {
    if (!(await confirm({ title: 'Excluir turma?', msg: 'As matrículas e a frequência desta turma também serão apagadas. Para manter o histórico, prefira marcar como “Encerrada”.', danger: true, okLabel: 'Excluir' }))) return
    await db.remove('turmas', turma.id)
    toast('Turma excluída.')
    history.back()
  }

  const st = STATUS_TURMA[turma.status]
  return (
    <>
      <Link to="/admin/cursos" className="no-print mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-royal"><ArrowLeft className="size-4" /> Cursos e turmas</Link>
      <PageHeader title={`${curso?.nome ?? 'Curso'} — ${turma.nome}`}
        subtitle={<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1"><CalendarDays className="size-4" />{turma.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')}</span>
          <span className="flex items-center gap-1"><Clock className="size-4" />{hhmm(turma.hora_inicio)}–{hhmm(turma.hora_fim)}</span>
          {turma.professor && <span className="flex items-center gap-1"><User className="size-4" />{turma.professor}</span>}
          {turma.sala && <span className="flex items-center gap-1"><MapPin className="size-4" />{turma.sala}</span>}
        </span>}
        actions={<div className="no-print flex gap-2">
          <Badge tone={st.tone} className="self-center">{st.label}</Badge>
          <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={excluirTurma} aria-label="Excluir turma" />
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditar(turma)}>Editar</Button>
        </div>}
      />

      <div className="no-print mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-slate-500">Alunos</p><p className="text-2xl font-extrabold text-navy">{ativos.length}<span className="text-base font-semibold text-slate-400">/{turma.vagas}</span></p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Vagas restantes</p><p className="text-2xl font-extrabold text-leaf-dark">{vagasRestantes(turma)}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Período</p><p className="font-bold text-navy">{fmtDate(turma.data_inicio)} a {fmtDate(turma.data_fim)}</p></Card>
      </div>

      <div className="no-print mb-4">
        <Tabs value={aba} onChange={setAba} items={[
          { value: 'alunos', label: <span className="flex items-center gap-1.5"><Users className="size-4" />Alunos</span>, count: ativos.length },
          { value: 'chamada', label: <span className="flex items-center gap-1.5"><ClipboardCheck className="size-4" />Chamada</span> },
          { value: 'frequencia', label: 'Frequência' },
          { value: 'desempenho', label: <span className="flex items-center gap-1.5"><Star className="size-4" />Desempenho</span> },
        ]} />
      </div>

      {aba === 'alunos' && (
        <Card>
          <div className="no-print flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row">
            <div className="flex-1">
              <SearchSelect items={membros.filter(m => m.ativo && !ativos.some(a => a.p!.id === m.id))} value={novoAluno} onChange={v => { setNovoAluno(v); if (v) matricular(v) }}
                getLabel={m => m.nome} getSearch={m => `${m.nome} ${m.carteirinha}`} placeholder="Matricular pessoa já cadastrada..."
                render={m => <span><b className="text-navy">{m.nome}</b> <span className="text-slate-500">· nº {m.carteirinha}{m.data_nascimento && ` · ${idade(m.data_nascimento)} anos`}</span></span>} />
            </div>
            <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setCadastrar({ ativo: true })}>Cadastrar novo aluno</Button>
            <Button variant="ghost" icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir lista</Button>
          </div>
          {ativos.length === 0 ? <EmptyState icon={<Users className="size-7" />} title="Nenhum aluno matriculado" /> : (
            <div className="print-area w-full">
              <p className="hidden p-4 text-lg font-bold print:block">{curso?.nome} — {turma.nome} ({turma.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')} {hhmm(turma.hora_inicio)})</p>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Idade</th><th className="hidden px-4 py-3 md:table-cell">Responsável</th><th className="px-4 py-3">Contato</th><th className="no-print px-4 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ativos.map(({ m, p }) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={p!.nome} className="no-print size-8" /><span className="font-semibold text-navy">{p!.nome}</span></div></td>
                      <td className="px-4 py-3 text-slate-600">{idade(p!.data_nascimento) ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{p!.responsavel_nome ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtPhone(p!.telefone || p!.responsavel_telefone) || '—'}</td>
                      <td className="no-print px-4 py-3 text-right">
                        <button onClick={() => removerMatricula(m.id, p!.nome)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Cancelar matrícula"><UserMinus className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {aba === 'chamada' && <Chamada turma={turma} alunos={ativos.map(a => a.p!)} />}
      {aba === 'frequencia' && <FrequenciaTabela turmaId={turma.id} alunos={ativos.map(a => a.p!)} />}
      {aba === 'desempenho' && <Desempenho turmaId={turma.id} alunos={ativos.map(a => a.p!)} />}

      <TurmaForm rascunho={editar} onClose={() => setEditar(null)} />
      <PessoaForm rascunho={cadastrar} onClose={() => setCadastrar(null)} onSaved={nid => { setCadastrar(null); matricular(nid) }} />
    </>
  )
}

function Chamada({ turma, alunos }: { turma: Turma; alunos: { id: string; nome: string }[] }) {
  const { toast } = useFeedback()
  const { data: freq } = useTable('frequencias')
  const [data, setData] = useState(today())
  const [marcas, setMarcas] = useState<Record<string, boolean>>({})
  const [salvando, setSalvando] = useState(false)
  const existentes = useMemo(() => freq.filter(f => f.turma_id === turma.id && f.data === data), [freq, turma.id, data])
  const diaDeAula = turma.dias_semana.includes(parseDate(data).getDay())

  useEffect(() => {
    const m: Record<string, boolean> = {}
    for (const a of alunos) m[a.id] = existentes.find(f => f.membro_id === a.id)?.presente ?? true
    setMarcas(m)
  }, [existentes, alunos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    setSalvando(true)
    try {
      for (const a of alunos) {
        const ex = existentes.find(f => f.membro_id === a.id)
        const presente = marcas[a.id] ?? true
        if (ex) { if (ex.presente !== presente) await db.update('frequencias', ex.id, { presente }) }
        else await db.insert('frequencias', { turma_id: turma.id, membro_id: a.id, data, presente, created_at: new Date().toISOString() })
      }
      toast(`Chamada de ${fmtDate(data)} salva!`)
    } catch (e) { toast(errMsg(e), 'error') } finally { setSalvando(false) }
  }

  const presentes = alunos.filter(a => marcas[a.id]).length
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between">
        <Field label="Data da aula"><Input type="date" value={data} max={today()} onChange={e => setData(e.target.value)} className="sm:w-48" /></Field>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">{presentes} presente(s) · {alunos.length - presentes} falta(s)</span>
          <Button onClick={salvar} loading={salvando} disabled={!alunos.length} icon={<ClipboardCheck className="size-4" />}>{existentes.length ? 'Atualizar chamada' : 'Salvar chamada'}</Button>
        </div>
      </div>
      {!diaDeAula && <div className="p-4 pb-0"><Alert tone="warn">{DIAS_LONGOS[parseDate(data).getDay()]} não é dia de aula desta turma. Confira a data.</Alert></div>}
      {existentes.length > 0 && <div className="p-4 pb-0"><Alert tone="success">A chamada deste dia já foi feita — você pode corrigi-la.</Alert></div>}
      {alunos.length === 0 ? <EmptyState icon={<Users className="size-7" />} title="Nenhum aluno matriculado" /> : (
        <ul className="grid gap-2 p-4 sm:grid-cols-2">
          {alunos.map(a => {
            const p = marcas[a.id] ?? true
            return (
              <li key={a.id}>
                <button onClick={() => setMarcas(m => ({ ...m, [a.id]: !p }))}
                  className={cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition', p ? 'bg-lime-50 ring-lime-200' : 'bg-red-50 ring-red-200')}>
                  <Avatar name={a.nome} />
                  <span className="flex-1 font-semibold text-navy">{a.nome}</span>
                  <span className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white', p ? 'bg-leaf' : 'bg-red-500')}>
                    {p ? <><Check className="size-3.5" /> Presente</> : <><X className="size-3.5" /> Falta</>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function FrequenciaTabela({ turmaId, alunos }: { turmaId: string; alunos: { id: string; nome: string }[] }) {
  const { data: freq } = useTable('frequencias')
  const fs = freq.filter(f => f.turma_id === turmaId)
  const datas = [...new Set(fs.map(f => f.data))].sort().slice(-12)
  if (!datas.length) return <Card><EmptyState icon={<ClipboardCheck className="size-7" />} title="Nenhuma chamada registrada ainda" /></Card>
  return (
    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left uppercase tracking-wide">Aluno</th>
              {datas.map(d => <th key={d} className="px-2 py-3 text-center font-semibold">{fmtDate(d).slice(0, 5)}</th>)}
              <th className="px-4 py-3 text-right uppercase tracking-wide">Freq.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alunos.map(a => {
              const meus = fs.filter(f => f.membro_id === a.id)
              const pct = meus.length ? Math.round((meus.filter(f => f.presente).length / meus.length) * 100) : null
              return (
                <tr key={a.id}>
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-semibold text-navy">{a.nome}</td>
                  {datas.map(d => {
                    const f = meus.find(x => x.data === d)
                    return <td key={d} className="px-2 py-2.5 text-center">{f ? (f.presente ? <Check className="mx-auto size-4 text-leaf-dark" /> : <X className="mx-auto size-4 text-red-500" />) : <span className="text-slate-300">·</span>}</td>
                  })}
                  <td className="px-4 py-2.5 text-right"><Badge tone={pct === null ? 'gray' : pct >= 75 ? 'green' : pct >= 50 ? 'amber' : 'red'}>{pct === null ? '—' : `${pct}%`}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Mostrando as últimas {datas.length} aulas. Verde: 75% ou mais de presença.</p>
    </Card>
  )
}

/** Desempenho e comportamento (só a equipe vê). */
function Desempenho({ turmaId, alunos }: { turmaId: string; alunos: { id: string; nome: string }[] }) {
  const { user } = useAuth()
  const { toast } = useFeedback()
  const { data: avaliacoes } = useTable('avaliacoes')
  const [form, setForm] = useState<{ membro: { id: string; nome: string }; data: string; desempenho: number | null; comportamento: number | null; observacao: string } | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const daTurma = avaliacoes.filter(a => a.turma_id === turmaId).sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at))

  const salvar = async () => {
    if (!form) return
    if (!form.desempenho && !form.comportamento && !form.observacao.trim()) { toast('Preencha pelo menos um campo.', 'error'); return }
    setSalvando(true)
    try {
      await db.insert('avaliacoes', { turma_id: turmaId, membro_id: form.membro.id, data: form.data, desempenho: form.desempenho, comportamento: form.comportamento,
        observacao: form.observacao.trim() || null, autor_id: user?.id ?? null, autor_nome: user?.nome ?? null, created_at: new Date().toISOString() })
      toast('Anotação registrada.')
      setForm(null)
    } catch (e) { toast(errMsg(e), 'error') } finally { setSalvando(false) }
  }

  return (
    <Card>
      <p className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">Anotações visíveis apenas para a equipe (administradores e professores). O aluno não vê.</p>
      {alunos.length === 0 ? <EmptyState icon={<Star className="size-7" />} title="Nenhum aluno matriculado" /> : (
        <ul className="divide-y divide-slate-100">
          {alunos.map(a => {
            const minhas = daTurma.filter(x => x.membro_id === a.id)
            const ult = minhas[0]
            return (
              <li key={a.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={a.nome} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setAberto(x => (x === a.id ? null : a.id))}>
                    <p className="font-semibold text-navy">{a.nome}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {ult?.desempenho && <Badge tone={ESCALA[ult.desempenho].tone}>Desempenho: {ESCALA[ult.desempenho].label}</Badge>}
                      {ult?.comportamento && <Badge tone={ESCALA[ult.comportamento].tone}>Comportamento: {ESCALA[ult.comportamento].label}</Badge>}
                      {!ult && <span className="text-xs text-slate-400">Sem anotações</span>}
                      {minhas.length > 1 && <span className="text-xs text-royal">{minhas.length} anotações — ver histórico</span>}
                    </div>
                  </button>
                  <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setForm({ membro: a, data: today(), desempenho: null, comportamento: null, observacao: '' })}>Anotar</Button>
                </div>
                {aberto === a.id && minhas.length > 0 && (
                  <ul className="mt-3 space-y-2 border-l-2 border-royal/20 pl-4">
                    {minhas.map(x => (
                      <li key={x.id} className="text-sm">
                        <span className="font-semibold text-slate-700">{fmtDate(x.data)}</span>
                        {x.desempenho && <span className="text-slate-500"> · desempenho {ESCALA[x.desempenho].label.toLowerCase()}</span>}
                        {x.comportamento && <span className="text-slate-500"> · comportamento {ESCALA[x.comportamento].label.toLowerCase()}</span>}
                        {x.observacao && <p className="text-slate-600">{x.observacao}</p>}
                        {x.autor_nome && <p className="text-xs text-slate-400">por {x.autor_nome}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Desempenho e comportamento" subtitle={form?.membro.nome}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar anotação</Button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Data"><Input type="date" value={form.data} max={today()} onChange={e => setForm({ ...form, data: e.target.value })} className="sm:w-48" /></Field>
            <div><p className="mb-1.5 text-sm font-semibold text-slate-700">Desempenho (aprendizado)</p><Escala valor={form.desempenho} onChange={v => setForm({ ...form, desempenho: v })} /></div>
            <div><p className="mb-1.5 text-sm font-semibold text-slate-700">Comportamento</p><Escala valor={form.comportamento} onChange={v => setForm({ ...form, comportamento: v })} /></div>
            <Field label="Observações"><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Ex.: concluiu o exercício de digitação; ajudou um colega..." /></Field>
          </div>
        )}
      </Modal>
    </Card>
  )
}

const COR_ESCALA: Record<number, string> = { 1: 'bg-red-500 text-white ring-red-500', 2: 'bg-amber-500 text-white ring-amber-500', 3: 'bg-royal text-white ring-royal', 4: 'bg-leaf text-white ring-leaf' }

function Escala({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[1, 2, 3, 4].map(n => (
        <button key={n} type="button" onClick={() => onChange(valor === n ? null : n)}
          className={cn('rounded-xl px-2 py-2 text-sm font-bold ring-1 transition', valor === n ? COR_ESCALA[n] : 'bg-white text-slate-600 ring-slate-200 hover:ring-royal/40')}>
          {ESCALA[n].label}
        </button>
      ))}
    </div>
  )
}

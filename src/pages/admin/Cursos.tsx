import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, FileSignature, GraduationCap, MessageCircle, Pencil, Plus, Printer, Trash2, UserPlus, Users, XCircle } from 'lucide-react'
import { GradeSemanal } from '../../components/Grade'
import { TermoAssinado } from '../../components/Termo'
import {
  Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Tabs, Textarea, useFeedback,
} from '../../components/ui'
import { db, useConfig, useTable } from '../../lib/db'
import { DIAS_CURTOS, fmtDateTime, hhmm, idade } from '../../lib/dates'
import { STATUS_TURMA, vagasRestantes } from '../../lib/services'
import type { Curso, Inscricao, Turma } from '../../lib/types'
import { cn, errMsg, fmtPhone, whatsappLink } from '../../lib/utils'

const CORES = ['#0339A6', '#0511F2', '#034C8C', '#7CBF17', '#0d9488', '#7c3aed', '#db2777', '#ea580c']

export default function CursosAdmin() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { data: cursos, loading } = useTable('cursos')
  const { data: turmas } = useTable('turmas')
  const { data: pre } = useTable('inscricoes')
  const [aba, setAba] = useState<'cursos' | 'grade' | 'pre'>((params.get('aba') as 'pre') || 'cursos')
  const [cursoForm, setCursoForm] = useState<Partial<Curso> | null>(null)
  const [turmaForm, setTurmaForm] = useState<Partial<Turma> | null>(null)
  const pendentes = pre.filter(p => p.status === 'pendente')

  return (
    <>
      <PageHeader title="Cursos e turmas" icon={<GraduationCap className="size-5" />}
        subtitle="Cursos de informática, turmas, horários, matrículas e chamada."
        actions={<>
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setCursoForm({ cor: CORES[0] })}>Novo curso</Button>
          <Button icon={<Plus className="size-4" />} disabled={!cursos.length} onClick={() => setTurmaForm({ curso_id: cursos[0]?.id, dias_semana: [], vagas: 10, status: 'inscricoes', hora_inicio: '08:00', hora_fim: '10:00', sala: 'Laboratório' })}>Nova turma</Button>
        </>}
      />
      <div className="mb-5">
        <Tabs value={aba} onChange={setAba} items={[
          { value: 'cursos', label: 'Cursos e turmas', count: turmas.filter(t => t.status !== 'encerrada').length },
          { value: 'grade', label: 'Grade semanal' },
          { value: 'pre', label: 'Inscrições', count: pendentes.length },
        ]} />
      </div>

      {loading ? <Spinner /> : aba === 'cursos' ? (
        cursos.length === 0 ? (
          <Card><EmptyState icon={<GraduationCap className="size-7" />} title="Nenhum curso cadastrado" text="Comece criando um curso (ex.: Informática Básica) e depois as turmas com os horários."
            action={<Button icon={<Plus className="size-4" />} onClick={() => setCursoForm({ cor: CORES[0] })}>Novo curso</Button>} /></Card>
        ) : (
          <div className="space-y-5">
            {cursos.map(c => {
              const ts = turmas.filter(t => t.curso_id === c.id).sort((a, b) => a.status.localeCompare(b.status) || a.nome.localeCompare(b.nome))
              return (
                <Card key={c.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5" style={{ borderTop: `5px solid ${c.cor ?? '#0339A6'}` }}>
                    <div>
                      <h2 className="text-lg font-extrabold text-navy">{c.nome}</h2>
                      <p className="text-sm text-slate-500">{[c.carga_horaria && `${c.carga_horaria}h`, c.publico].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setCursoForm(c)}>Editar</Button>
                      <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setTurmaForm({ curso_id: c.id, dias_semana: [], vagas: 10, status: 'inscricoes', hora_inicio: '08:00', hora_fim: '10:00', sala: 'Laboratório' })}>Turma</Button>
                    </div>
                  </div>
                  {ts.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhuma turma ainda.</p> : (
                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                      {ts.map(t => {
                        const st = STATUS_TURMA[t.status]
                        const pct = t.vagas ? Math.min(100, (t.matriculados / t.vagas) * 100) : 0
                        return (
                          <Link key={t.id} to={`/admin/turmas/${t.id}`} className={cn('block rounded-2xl p-4 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-royal/30', t.status === 'encerrada' ? 'bg-slate-50 opacity-70' : 'bg-white')}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-navy">{t.nome}</p>
                              <Badge tone={st.tone}>{st.label}</Badge>
                            </div>
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays className="size-4 text-royal" /> {t.dias_semana.map(d => DIAS_CURTOS[d]).join(', ') || '—'} · {hhmm(t.hora_inicio)}–{hhmm(t.hora_fim)}</p>
                            {t.professor && <p className="mt-0.5 text-sm text-slate-500">{t.professor}</p>}
                            <div className="mt-3">
                              <div className="flex justify-between text-xs font-semibold text-slate-500"><span>{t.matriculados} aluno(s)</span><span>{vagasRestantes(t)} vaga(s)</span></div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-royal" style={{ width: `${pct}%` }} /></div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )
      ) : aba === 'grade' ? (
        <Card className="p-5"><GradeSemanal turmas={turmas} cursos={cursos} destaque={new Date().getDay()} onClick={t => nav(`/admin/turmas/${t.id}`)} /></Card>
      ) : (
        <Inscricoes />
      )}

      <CursoForm rascunho={cursoForm} onClose={() => setCursoForm(null)} />
      <TurmaForm rascunho={turmaForm} onClose={() => setTurmaForm(null)} />
    </>
  )
}

function CursoForm({ rascunho, onClose }: { rascunho: Partial<Curso> | null; onClose: () => void }) {
  const { toast, confirm } = useFeedback()
  const { data: turmas } = useTable('turmas')
  const [f, setF] = useState<Partial<Curso>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (rascunho) { setF(rascunho); setErro(null) } }, [rascunho])
  const txt = (k: keyof Curso) => ({ value: (f[k] as string | number | null | undefined) ?? '', onChange: (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: e.target.value })) })

  const salvar = async () => {
    if (!f.nome?.trim()) return setErro('Informe o nome do curso.')
    const row = { nome: f.nome.trim(), descricao: f.descricao || null, carga_horaria: f.carga_horaria ? Number(f.carga_horaria) : null, publico: f.publico || null, cor: f.cor || CORES[0] }
    setSalvando(true)
    try {
      if (f.id) await db.update('cursos', f.id, row)
      else await db.insert('cursos', { ...row, created_at: new Date().toISOString() })
      toast('Curso salvo.'); onClose()
    } catch (e) { setErro(errMsg(e)) } finally { setSalvando(false) }
  }
  const excluir = async () => {
    if (turmas.some(t => t.curso_id === f.id)) { toast('Exclua ou mova as turmas deste curso primeiro.', 'error'); return }
    if (!(await confirm({ title: 'Excluir curso?', msg: f.nome, danger: true, okLabel: 'Excluir' }))) return
    await db.remove('cursos', f.id!); toast('Curso excluído.'); onClose()
  }

  return (
    <Modal open={!!rascunho} onClose={onClose} title={f.id ? 'Editar curso' : 'Novo curso'}
      footer={<>{f.id && <Button variant="ghost" className="mr-auto text-red-600" icon={<Trash2 className="size-4" />} onClick={excluir}>Excluir</Button>}
        <Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do curso" required className="sm:col-span-2"><Input {...txt('nome')} placeholder="Ex.: Informática Básica" autoFocus /></Field>
        <Field label="Descrição" className="sm:col-span-2"><Textarea {...txt('descricao')} placeholder="O que os alunos vão aprender" /></Field>
        <Field label="Carga horária (horas)"><Input type="number" {...txt('carga_horaria')} /></Field>
        <Field label="Público"><Input {...txt('publico')} placeholder="Ex.: De 8 a 14 anos" /></Field>
        <Field label="Cor de identificação" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {CORES.map(c => <button key={c} type="button" onClick={() => setF(x => ({ ...x, cor: c }))} className={cn('size-9 rounded-full ring-offset-2 transition', f.cor === c && 'ring-2 ring-navy')} style={{ background: c }} aria-label={c} />)}
          </div>
        </Field>
        {erro && <div className="sm:col-span-2"><Alert tone="error">{erro}</Alert></div>}
      </div>
    </Modal>
  )
}

export function TurmaForm({ rascunho, onClose }: { rascunho: Partial<Turma> | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const { data: cursos } = useTable('cursos')
  const [f, setF] = useState<Partial<Turma>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (rascunho) { setF(rascunho); setErro(null) } }, [rascunho])
  const txt = (k: keyof Turma) => ({ value: (f[k] as string | number | null | undefined) ?? '', onChange: (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: e.target.value })) })
  const toggleDia = (d: number) => setF(x => ({ ...x, dias_semana: x.dias_semana?.includes(d) ? x.dias_semana.filter(y => y !== d) : [...(x.dias_semana ?? []), d].sort() }))

  const salvar = async () => {
    setErro(null)
    if (!f.curso_id) return setErro('Escolha o curso.')
    if (!f.nome?.trim()) return setErro('Dê um nome para a turma (ex.: Turma A — Manhã).')
    if (!f.dias_semana?.length) return setErro('Marque pelo menos um dia da semana.')
    if (!f.hora_inicio || !f.hora_fim || f.hora_fim <= f.hora_inicio) return setErro('Confira o horário de início e fim.')
    const row: Partial<Turma> = {
      curso_id: f.curso_id, nome: f.nome.trim(), professor: f.professor || null, dias_semana: f.dias_semana,
      hora_inicio: f.hora_inicio, hora_fim: f.hora_fim, sala: f.sala || null, vagas: Math.max(1, Number(f.vagas) || 1),
      data_inicio: f.data_inicio || null, data_fim: f.data_fim || null, status: f.status ?? 'inscricoes',
    }
    setSalvando(true)
    try {
      if (f.id) await db.update('turmas', f.id, row)
      else await db.insert('turmas', { ...row, matriculados: 0, created_at: new Date().toISOString() })
      toast('Turma salva.'); onClose()
    } catch (e) { setErro(errMsg(e)) } finally { setSalvando(false) }
  }

  return (
    <Modal open={!!rascunho} onClose={onClose} size="lg" title={f.id ? 'Editar turma' : 'Nova turma'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar turma</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Curso" required><Select {...txt('curso_id')}>{cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></Field>
        <Field label="Nome da turma" required><Input {...txt('nome')} placeholder="Turma A — Manhã" /></Field>
        <Field label="Dias de aula" required className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <button key={d} type="button" onClick={() => toggleDia(d)} className={cn('w-14 rounded-xl py-2 text-sm font-bold ring-1 transition', f.dias_semana?.includes(d) ? 'bg-royal text-white ring-royal' : 'bg-white text-slate-600 ring-slate-200 hover:ring-royal/40')}>{DIAS_CURTOS[d]}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" required><Input type="time" {...txt('hora_inicio')} /></Field>
          <Field label="Fim" required><Input type="time" {...txt('hora_fim')} /></Field>
        </div>
        <Field label="Professor"><Input {...txt('professor')} /></Field>
        <Field label="Sala / local"><Input {...txt('sala')} /></Field>
        <Field label="Vagas" required><Input type="number" min={1} {...txt('vagas')} /></Field>
        <Field label="Data de início"><Input type="date" {...txt('data_inicio')} /></Field>
        <Field label="Data de término"><Input type="date" {...txt('data_fim')} /></Field>
        <Field label="Situação" className="sm:col-span-2">
          <Select {...txt('status')}>
            {Object.entries(STATUS_TURMA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        {erro && <div className="sm:col-span-2"><Alert tone="error">{erro}</Alert></div>}
      </div>
    </Modal>
  )
}

function Inscricoes() {
  const cfg = useConfig()
  const { toast, confirm } = useFeedback()
  const { data: insc, loading } = useTable('inscricoes')
  const { data: turmas } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: membros } = useTable('membros')
  const [filtro, setFiltro] = useState<Inscricao['status']>('pendente')
  const [termo, setTermo] = useState<Inscricao | null>(null)
  const [recusar, setRecusar] = useState<Inscricao | null>(null)
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)

  const lista = insc.filter(p => p.status === filtro).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const turmaDe = (id: string) => turmas.find(x => x.id === id)
  const cursoDe = (t?: Turma) => cursos.find(c => c.id === t?.curso_id)
  const horario = (t?: Turma) => t ? `${t.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')}, ${hhmm(t.hora_inicio)} às ${hhmm(t.hora_fim)}` : ''

  const aprovar = async (i: Inscricao) => {
    const m = membros.find(x => x.id === i.membro_id)
    const t = turmaDe(i.turma_id)
    if (!(await confirm({ title: 'Aprovar inscrição?', msg: <><b>{m?.nome}</b> será matriculado(a) em <b>{cursoDe(t)?.nome} — {t?.nome}</b> e receberá as informações das aulas por mensagem e e-mail.</>, okLabel: 'Aprovar e matricular' }))) return
    setOcupado(i.id)
    try { await db.rpc('aprovar_inscricao', { p_id: i.id }, ['inscricoes']); toast('Inscrição aprovada — aluno avisado!') }
    catch (e) { toast(errMsg(e), 'error') } finally { setOcupado(null) }
  }
  const confirmarRecusa = async () => {
    if (!recusar) return
    setOcupado(recusar.id)
    try { await db.rpc('recusar_inscricao', { p_id: recusar.id, p_motivo: motivo.trim() }, ['inscricoes']); toast('Inscrição recusada — aluno avisado.'); setRecusar(null); setMotivo('') }
    catch (e) { toast(errMsg(e), 'error') } finally { setOcupado(null) }
  }

  const tm = termo ? turmaDe(termo.turma_id) : undefined
  const mt = termo ? membros.find(x => x.id === termo.membro_id) : undefined

  return (
    <>
      <div className="mb-4">
        <Tabs value={filtro} onChange={setFiltro} items={[
          { value: 'pendente', label: 'Aguardando', count: insc.filter(p => p.status === 'pendente').length },
          { value: 'aprovada', label: 'Aprovadas' },
          { value: 'recusada', label: 'Recusadas' },
          { value: 'cancelada', label: 'Canceladas' },
        ]} />
      </div>
      {loading ? <Spinner /> : lista.length === 0 ? (
        <Card><EmptyState icon={<UserPlus className="size-7" />} title="Nenhuma inscrição aqui" text="As inscrições feitas pelos leitores na página de cursos aparecem nesta lista." /></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map(i => {
            const t = turmaDe(i.turma_id)
            const m = membros.find(x => x.id === i.membro_id)
            const tel = i.responsavel_telefone || m?.telefone
            const wa = whatsappLink(tel, `Olá${i.responsavel_nome ? ', ' + i.responsavel_nome.split(' ')[0] : ''}! Aqui é da ${cfg.nome_biblioteca}, sobre a inscrição de ${m?.nome.split(' ')[0]} no curso ${cursoDe(t)?.nome}.`)
            return (
              <Card key={i.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-navy">{m?.nome ?? 'Pessoa'}{m?.data_nascimento && <span className="font-medium text-slate-500"> · {idade(m.data_nascimento)} anos</span>}</p>
                    <p className="text-sm font-semibold text-royal">{cursoDe(t)?.nome} — {t?.nome}</p>
                    <p className="text-xs text-slate-500">Carteirinha nº {m?.carteirinha} · enviada {fmtDateTime(i.created_at)}</p>
                  </div>
                  {i.menor ? <Badge tone="amber">Menor</Badge> : <Badge tone="gray">Adulto</Badge>}
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  {i.menor && <p><Users className="mr-1.5 inline size-4 text-slate-400" />{i.responsavel_nome} ({i.responsavel_parentesco}) · {fmtPhone(i.responsavel_telefone)}</p>}
                  {!i.menor && m?.telefone && <p><Clock className="mr-1.5 inline size-4 text-slate-400" />{fmtPhone(m.telefone)}</p>}
                  {i.observacoes && <p className="rounded-lg bg-slate-50 p-2">“{i.observacoes}”</p>}
                  {i.motivo_recusa && <p className="text-red-600">Motivo: {i.motivo_recusa}</p>}
                  {t && vagasRestantes(t) <= 0 && i.status === 'pendente' && <Alert tone="warn">Turma cheia ({t.matriculados}/{t.vagas}). Aumente as vagas para aprovar.</Alert>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {i.menor && <Button size="sm" variant="secondary" icon={<FileSignature className="size-4" />} onClick={() => setTermo(i)}>Ver termo assinado</Button>}
                  {wa && <a href={wa} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon={<MessageCircle className="size-4 text-leaf-dark" />}>WhatsApp</Button></a>}
                  {i.status === 'pendente' && <>
                    <Button size="sm" variant="ghost" className="ml-auto" icon={<XCircle className="size-4" />} onClick={() => { setRecusar(i); setMotivo('') }}>Recusar</Button>
                    <Button size="sm" variant="success" loading={ocupado === i.id} icon={<CheckCircle2 className="size-4" />} onClick={() => aprovar(i)}>Aprovar</Button>
                  </>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!termo} onClose={() => setTermo(null)} size="lg" title="Termo de autorização" subtitle={mt?.nome}
        footer={<><Button variant="secondary" onClick={() => setTermo(null)}>Fechar</Button><Button icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir</Button></>}>
        {termo && mt && (
          <TermoAssinado assinatura={termo.assinatura} aceitoEm={termo.termo_aceito_em}
            d={{ aluno: mt.nome, nascimento: mt.data_nascimento, curso: cursoDe(tm)?.nome ?? '', turma: tm?.nome ?? '', horario: horario(tm),
              responsavel: termo.responsavel_nome ?? '', parentesco: termo.responsavel_parentesco ?? '', telefone: termo.responsavel_telefone ?? '', biblioteca: cfg.nome_biblioteca }} />
        )}
      </Modal>

      <Modal open={!!recusar} onClose={() => setRecusar(null)} title="Recusar inscrição" size="sm"
        footer={<><Button variant="secondary" onClick={() => setRecusar(null)}>Cancelar</Button><Button variant="danger" loading={!!ocupado} onClick={confirmarRecusa}>Recusar e avisar</Button></>}>
        <Field label="Motivo (será enviado ao aluno)" hint="Ex.: turma lotada, idade fora da faixa do curso..."><Textarea value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={500} /></Field>
      </Modal>
    </>
  )
}

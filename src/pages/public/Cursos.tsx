import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, GraduationCap, IdCard, LogIn, MapPin, User, UserPlus, Users } from 'lucide-react'
import { GradeSemanal } from '../../components/Grade'
import { SignaturePad } from '../../components/SignaturePad'
import { TERMO_VERSAO, TextoTermo } from '../../components/Termo'
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Textarea, useFeedback } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { db, useConfig, useTable } from '../../lib/db'
import { DIAS_CURTOS, fmtDate, hhmm, idade } from '../../lib/dates'
import { STATUS_TURMA, vagasRestantes } from '../../lib/services'
import type { Membro, Turma } from '../../lib/types'
import { digits, errMsg } from '../../lib/utils'

export default function CursosPublico() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: cursos, loading } = useTable('cursos')
  const { data: turmas } = useTable('turmas')
  const { data: membros } = useTable('membros')
  const { data: inscricoes } = useTable('inscricoes')
  const { data: matriculas } = useTable('matriculas')
  const [inscrever, setInscrever] = useState<Turma | null>(null)
  const [pergunta, setPergunta] = useState<Turma | null>(null)

  const membro = user ? membros.find(m => m.id === user.membro_id) : undefined
  const situacao = (t: Turma): string | null => {
    if (!membro) return null
    if (matriculas.some(m => m.turma_id === t.id && m.membro_id === membro.id && m.status === 'ativa')) return 'Matriculado'
    if (inscricoes.some(i => i.turma_id === t.id && i.membro_id === membro.id && i.status === 'pendente')) return 'Inscrição enviada'
    return null
  }

  // volta do login/cadastro: abre a inscrição automaticamente
  useEffect(() => {
    const id = params.get('inscrever')
    if (!id || !user || !turmas.length) return
    const t = turmas.find(x => x.id === id)
    params.delete('inscrever'); setParams(params, { replace: true })
    if (t) setInscrever(t)
  }, [user, turmas.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const clicar = (t: Turma) => (user ? setInscrever(t) : setPergunta(t))
  const irPara = (criar: boolean) => {
    const voltar = encodeURIComponent(`/cursos?inscrever=${pergunta?.id}`)
    nav(`/entrar?motivo=inscricao&voltar=${voltar}${criar ? '&criar=1' : ''}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-leaf-dark">Gratuitos</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Cursos de informática</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Aulas no laboratório da Biblioteca Digital para crianças e jovens de Sobrália. A inscrição é feita pelo site e é preciso ter cadastro na biblioteca (é grátis e sai na hora).</p>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {[
            [<IdCard key="1" className="size-5" />, '1. Tenha seu cadastro', 'Entre na sua conta ou crie uma.'],
            [<GraduationCap key="2" className="size-5" />, '2. Escolha a turma', 'Menores de 18: o responsável assina o termo online.'],
            [<CheckCircle2 key="3" className="size-5" />, '3. Aguarde a aprovação', 'Você recebe os detalhes das aulas por e-mail.'],
          ].map(([i, t, d]) => (
            <div key={t as string} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf-dark">{i}</div>
              <div><p className="font-bold text-navy">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
            </div>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : cursos.length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-7" />} title="Nenhum curso cadastrado ainda" />
      ) : (
        <div className="space-y-6">
          {cursos.map(c => {
            const ts = turmas.filter(t => t.curso_id === c.id && t.status !== 'encerrada')
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex flex-col gap-1 border-b border-slate-100 p-5 sm:p-6" style={{ borderTop: `5px solid ${c.cor ?? '#0339A6'}` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-navy">{c.nome}</h2>
                    {c.carga_horaria && <Badge tone="gray">{c.carga_horaria}h</Badge>}
                    {c.publico && <Badge tone="violet"><Users className="size-3" /> {c.publico}</Badge>}
                  </div>
                  {c.descricao && <p className="text-slate-600">{c.descricao}</p>}
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ts.length === 0 && <p className="p-2 text-sm text-slate-500">Nenhuma turma aberta no momento.</p>}
                  {ts.map(t => {
                    const vagas = vagasRestantes(t)
                    const st = STATUS_TURMA[t.status]
                    const sit = situacao(t)
                    return (
                      <div key={t.id} className="flex flex-col rounded-2xl bg-paper p-4 ring-1 ring-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-navy">{t.nome}</p>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                          <li className="flex gap-2"><CalendarDays className="size-4 text-royal" />{t.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')}</li>
                          <li className="flex gap-2"><Clock className="size-4 text-royal" />{hhmm(t.hora_inicio)} às {hhmm(t.hora_fim)}</li>
                          {t.professor && <li className="flex gap-2"><User className="size-4 text-royal" />{t.professor}</li>}
                          {t.sala && <li className="flex gap-2"><MapPin className="size-4 text-royal" />{t.sala}</li>}
                          {t.data_inicio && <li className="text-xs text-slate-500">Período: {fmtDate(t.data_inicio)} a {fmtDate(t.data_fim)}</li>}
                        </ul>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <span className={vagas > 0 ? 'text-sm font-bold text-leaf-dark' : 'text-sm font-bold text-slate-400'}>
                            {vagas > 0 ? `${vagas} vaga(s)` : 'Turma cheia'}
                          </span>
                          {sit ? <Badge tone="green"><CheckCircle2 className="size-3" /> {sit}</Badge> : (
                            <Button size="sm" variant={vagas > 0 ? 'primary' : 'secondary'} onClick={() => clicar(t)}>
                              {vagas > 0 ? 'Inscrever-se' : 'Lista de espera'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-navy"><CalendarDays className="size-5 text-royal" /> Grade semanal de aulas</h2>
            <GradeSemanal turmas={turmas} cursos={cursos} destaque={new Date().getDay()} />
          </Card>
        </div>
      )}

      {/* Visitante: já é cadastrado? */}
      <Modal open={!!pergunta} onClose={() => setPergunta(null)} title="Você já tem cadastro na biblioteca?" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">As inscrições nos cursos são feitas com o cadastro da biblioteca (sua carteirinha).</p>
          <button onClick={() => irPara(false)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 ring-slate-200 transition hover:bg-royal/5 hover:ring-royal/40">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-royal text-white"><LogIn className="size-5" /></div>
            <div><p className="font-bold text-navy">Sim, já sou cadastrado</p><p className="text-xs text-slate-500">Entrar com meu e-mail e senha</p></div>
          </button>
          <button onClick={() => irPara(true)} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 ring-slate-200 transition hover:bg-leaf/5 hover:ring-leaf/50">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf text-white"><UserPlus className="size-5" /></div>
            <div><p className="font-bold text-navy">Não, quero me cadastrar</p><p className="text-xs text-slate-500">Grátis — a carteirinha sai na hora</p></div>
          </button>
          <p className="text-xs text-slate-500">Fez a carteirinha no balcão mas ainda não tem conta no site? Escolha <b>“quero me cadastrar”</b> usando o <b>mesmo e-mail</b> informado na biblioteca — o cadastro é reaproveitado.</p>
        </div>
      </Modal>

      <InscricaoModal turma={inscrever} membro={membro} onClose={() => setInscrever(null)} />
    </div>
  )
}

function InscricaoModal({ turma, membro, onClose }: { turma: Turma | null; membro: Membro | undefined; onClose: () => void }) {
  const cfg = useConfig()
  const { user } = useAuth()
  const { toast } = useFeedback()
  const { data: cursos } = useTable('cursos')
  const [resp, setResp] = useState({ nome: '', parentesco: 'Mãe', telefone: '', email: '' })
  const [obs, setObs] = useState('')
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (turma) {
      setOk(false); setErro(null); setAssinatura(null); setAceite(false); setObs('')
      setResp({ nome: membro?.responsavel_nome ?? '', parentesco: 'Mãe', telefone: membro?.responsavel_telefone ?? '', email: '' })
    }
  }, [turma?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!turma) return null
  const curso = cursos.find(c => c.id === turma.curso_id)
  const anos = idade(membro?.data_nascimento ?? null)
  const menor = anos === null || anos < 18
  const horario = `${turma.dias_semana.map(d => DIAS_CURTOS[d]).join(', ')}, ${hhmm(turma.hora_inicio)} às ${hhmm(turma.hora_fim)}`

  const enviar = async () => {
    if (!membro) return
    setErro(null)
    if (menor) {
      if (resp.nome.trim().split(/\s+/).length < 2) return setErro('Informe o nome completo do responsável.')
      if (digits(resp.telefone).length < 10) return setErro('Informe o telefone do responsável com DDD.')
      if (!assinatura) return setErro('O responsável precisa assinar o termo.')
      if (!aceite) return setErro('Marque que o responsável leu e concorda com o termo.')
    }
    setEnviando(true)
    try {
      await db.insert('inscricoes', {
        turma_id: turma.id, membro_id: membro.id, status: 'pendente', menor,
        responsavel_nome: menor ? resp.nome.trim() : null, responsavel_parentesco: menor ? resp.parentesco : null,
        responsavel_telefone: menor ? digits(resp.telefone) : null, responsavel_email: menor ? resp.email.trim() || null : null,
        termo_versao: menor ? TERMO_VERSAO : null, assinatura: menor ? assinatura : null, observacoes: obs.trim() || null,
      })
      setOk(true)
      toast('Inscrição enviada!')
    } catch (e) { setErro(errMsg(e)) } finally { setEnviando(false) }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`Inscrição: ${curso?.nome ?? 'Curso'}`} subtitle={`${turma.nome} · ${horario}`}
      footer={ok || !membro ? <Button onClick={onClose}>Fechar</Button> : <>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={enviar} loading={enviando}>Enviar inscrição</Button>
      </>}>
      {!membro ? (
        <Alert tone="warn">
          {user ? 'Sua conta ainda não tem carteirinha (confirme seu e-mail ou procure a biblioteca). Contas da equipe não fazem inscrição.' : 'Entre na sua conta para se inscrever.'}
        </Alert>
      ) : ok ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto size-14 text-leaf" />
          <p className="mt-3 text-lg font-extrabold text-navy">Inscrição enviada!</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">A equipe vai analisar e você recebe a resposta por e-mail e em <b>Minha área → Mensagens</b>, com todas as informações das aulas.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 ring-1 ring-slate-200">
            <IdCard className="size-6 shrink-0 text-royal" />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-navy">{membro.nome}</p>
              <p className="text-slate-500">Carteirinha nº {membro.carteirinha}{anos !== null && ` · ${anos} anos`}</p>
            </div>
          </div>

          {menor && (
            <>
              <Alert tone="info">
                {anos === null ? 'Não encontramos sua data de nascimento, então' : 'Como o aluno tem menos de 18 anos,'} é necessário que o <b>pai, mãe ou responsável</b> preencha os dados abaixo e <b>assine o termo</b>.
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo do responsável" required className="sm:col-span-2"><Input value={resp.nome} onChange={e => setResp(r => ({ ...r, nome: e.target.value }))} maxLength={120} /></Field>
                <Field label="Parentesco" required>
                  <Select value={resp.parentesco} onChange={e => setResp(r => ({ ...r, parentesco: e.target.value }))}>
                    {['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Responsável legal'].map(p => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Telefone / WhatsApp do responsável" required><Input value={resp.telefone} onChange={e => setResp(r => ({ ...r, telefone: e.target.value }))} inputMode="tel" placeholder="(33) 9 9999-9999" maxLength={16} /></Field>
                <Field label="E-mail do responsável (opcional)" className="sm:col-span-2"><Input type="email" value={resp.email} onChange={e => setResp(r => ({ ...r, email: e.target.value }))} maxLength={160} /></Field>
              </div>
              <div className="scrollbar-thin max-h-72 overflow-y-auto rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <TextoTermo d={{ aluno: membro.nome, nascimento: membro.data_nascimento, curso: curso?.nome ?? '', turma: turma.nome, horario,
                  responsavel: resp.nome.trim(), parentesco: resp.parentesco, telefone: digits(resp.telefone), biblioteca: cfg.nome_biblioteca }} />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">Assinatura do responsável <span className="text-red-500">*</span></p>
                <SignaturePad onChange={setAssinatura} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200">
                <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-0.5 size-5 accent-royal" />
                <span className="text-sm text-slate-700">Eu, responsável, li o termo acima e <b>concordo</b> com a participação do(a) aluno(a) no curso.</span>
              </label>
            </>
          )}

          <Field label="Observações (opcional)"><Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: necessidades especiais, melhor horário para contato..." /></Field>
          {erro && <Alert tone="error">{erro}</Alert>}
        </div>
      )}
    </Modal>
  )
}

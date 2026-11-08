import { useMemo, useState } from 'react'
import { Mail, MessageCircle, Send, Users, X } from 'lucide-react'
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, PageHeader, SearchSelect, Select, Tabs, Textarea, useFeedback,
} from '../../components/ui'
import { isBalcao, useAuth } from '../../lib/auth'
import { DEMO_MODE } from '../../lib/config'
import { db, useConfig, useTable } from '../../lib/db'
import { fmtDateTime } from '../../lib/dates'
import { atrasado } from '../../lib/services'
import { errMsg, whatsappLink } from '../../lib/utils'

type Modo = 'pessoas' | 'turma' | 'atrasados' | 'todos'

export default function Mensagens() {
  const { user } = useAuth()
  const admin = isBalcao(user?.role)
  const cfg = useConfig()
  const { toast, confirm } = useFeedback()
  const { data: membros } = useTable('membros')
  const { data: turmas } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: matriculas } = useTable('matriculas')
  const { data: emps } = useTable('emprestimos')
  const { data: mensagens } = useTable('mensagens')
  const { data: profiles } = useTable('profiles')

  const [modo, setModo] = useState<Modo>('pessoas')
  const [pessoas, setPessoas] = useState<string[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [assunto, setAssunto] = useState('')
  const [corpo, setCorpo] = useState('')
  const [porEmail, setPorEmail] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const ativos = membros.filter(m => m.ativo)
  const destinatarios = useMemo(() => {
    if (modo === 'pessoas') return pessoas
    if (modo === 'turma') return [...new Set(matriculas.filter(m => m.turma_id === turmaId && m.status === 'ativa').map(m => m.membro_id))]
    if (modo === 'atrasados') return [...new Set(emps.filter(atrasado).map(e => e.membro_id))]
    return ativos.map(m => m.id)
  }, [modo, pessoas, turmaId, matriculas, emps, ativos])

  const comEmail = destinatarios.filter(id => {
    const m = membros.find(x => x.id === id)
    return m?.email || profiles.some(p => p.membro_id === id)
  }).length
  const unico = destinatarios.length === 1 ? membros.find(m => m.id === destinatarios[0]) : undefined
  const waUnico = unico && whatsappLink(unico.telefone || unico.responsavel_telefone, `${assunto ? `*${assunto}*\n\n` : ''}${corpo}\n\n— ${cfg.nome_biblioteca}`)

  const enviar = async () => {
    if (!destinatarios.length) { toast('Escolha pelo menos um destinatário.', 'error'); return }
    if (!assunto.trim() || !corpo.trim()) { toast('Preencha o assunto e a mensagem.', 'error'); return }
    if (destinatarios.length > 20 && !(await confirm({ title: `Enviar para ${destinatarios.length} pessoas?`, msg: 'A mensagem aparecerá na área de cada uma' + (porEmail ? ' e será enviada por e-mail.' : '.'), okLabel: 'Enviar' }))) return
    setEnviando(true)
    try {
      const n = await db.rpc<number>('enviar_mensagem', { p_membros: destinatarios, p_assunto: assunto.trim(), p_corpo: corpo.trim(), p_email: porEmail }, ['mensagens'])
      toast(`Mensagem enviada para ${n} pessoa(s)!`)
      setAssunto(''); setCorpo(''); setPessoas([])
    } catch (e) { toast(errMsg(e), 'error') } finally { setEnviando(false) }
  }

  // histórico agrupado por envio
  const historico = useMemo(() => {
    const grupos = new Map<string, { assunto: string; corpo: string; remetente: string; data: string; total: number; lidas: number; email: boolean; tipo: string }>()
    for (const m of mensagens) {
      if (!admin && m.remetente_id !== user?.id) continue
      const k = `${m.remetente_id}|${m.assunto}|${m.created_at.slice(0, 16)}`
      const g = grupos.get(k) ?? { assunto: m.assunto, corpo: m.corpo, remetente: m.remetente_nome ?? 'Sistema (automático)', data: m.created_at, total: 0, lidas: 0, email: m.por_email, tipo: m.tipo }
      g.total++; if (m.lida_em) g.lidas++
      grupos.set(k, g)
    }
    return [...grupos.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 50)
  }, [mensagens, admin, user?.id])

  const minhasTurmas = turmas.filter(t => t.status !== 'encerrada')

  return (
    <>
      <PageHeader title="Mensagens" icon={<Send className="size-5" />}
        subtitle={admin ? 'Envie avisos para leitores e alunos. Aparecem na “Minha área” e, se marcado, por e-mail.' : 'Envie avisos para os seus alunos. Aparecem na “Minha área” e, se marcado, por e-mail.'} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-extrabold text-navy">Nova mensagem</h2>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">Para quem?</p>
              <Tabs value={modo} onChange={setModo} items={[
                { value: 'pessoas', label: 'Pessoas' },
                { value: 'turma', label: 'Uma turma' },
                ...(admin ? [{ value: 'atrasados' as const, label: 'Com atraso' }, { value: 'todos' as const, label: 'Todos' }] : []),
              ]} />
            </div>

            {modo === 'pessoas' && (
              <div className="space-y-2">
                <SearchSelect items={ativos.filter(m => !pessoas.includes(m.id))} value={null} onChange={id => id && setPessoas(p => [...p, id])}
                  getLabel={m => m.nome} getSearch={m => `${m.nome} ${m.carteirinha}`} placeholder={admin ? 'Buscar leitor ou aluno...' : 'Buscar aluno...'}
                  render={m => <span><b className="text-navy">{m.nome}</b> <span className="text-slate-500">· nº {m.carteirinha}</span></span>} />
                {pessoas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pessoas.map(id => {
                      const m = membros.find(x => x.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-royal/10 py-1 pl-1 pr-2 text-sm font-semibold text-royal">
                          <Avatar name={m?.nome ?? '?'} className="size-6 text-[9px]" />{m?.nome.split(' ')[0]}
                          <button onClick={() => setPessoas(p => p.filter(x => x !== id))} aria-label="Remover"><X className="size-3.5" /></button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {modo === 'turma' && (
              <Select value={turmaId} onChange={e => setTurmaId(e.target.value)}>
                <option value="">Escolha a turma...</option>
                {minhasTurmas.map(t => <option key={t.id} value={t.id}>{cursos.find(c => c.id === t.curso_id)?.nome} — {t.nome}</option>)}
              </Select>
            )}
            {modo === 'atrasados' && <Alert tone="info">Todas as pessoas com livro atrasado. (Elas já recebem aviso automático; use para um recado extra.)</Alert>}
            {modo === 'todos' && <Alert tone="warn">A mensagem vai para <b>todos os {ativos.length} cadastros ativos</b>. Use com moderação.</Alert>}

            <Field label="Assunto"><Input value={assunto} onChange={e => setAssunto(e.target.value)} maxLength={150} placeholder="Ex.: Não haverá aula na sexta-feira" /></Field>
            <Field label="Mensagem"><Textarea value={corpo} onChange={e => setCorpo(e.target.value)} maxLength={4000} className="min-h-[140px]" /></Field>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200">
              <input type="checkbox" checked={porEmail} onChange={e => setPorEmail(e.target.checked)} className="size-5 accent-royal" />
              <Mail className="size-5 text-royal" />
              <span className="text-sm text-slate-700">Enviar também por e-mail <span className="block text-xs text-slate-500">{comEmail} de {destinatarios.length} destinatário(s) têm e-mail{DEMO_MODE && ' · na demonstração nada é enviado'}</span></span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Users className="size-4" /> {destinatarios.length} destinatário(s)</span>
              <div className="flex gap-2">
                {waUnico && assunto && corpo && <a href={waUnico} target="_blank" rel="noreferrer"><Button variant="secondary" icon={<MessageCircle className="size-4 text-leaf-dark" />}>WhatsApp</Button></a>}
                <Button onClick={enviar} loading={enviando} disabled={!destinatarios.length} icon={<Send className="size-4" />}>Enviar</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-navy">{admin ? 'Mensagens enviadas' : 'Minhas mensagens enviadas'}</h2></div>
          {historico.length === 0 ? <EmptyState icon={<Mail className="size-7" />} title="Nenhuma mensagem enviada ainda" /> : (
            <ul className="divide-y divide-slate-100">
              {historico.map((h, i) => (
                <li key={i} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-navy">{h.assunto}</p>
                    <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(h.data)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">{h.corpo}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={h.tipo === 'atraso' ? 'red' : h.tipo === 'inscricao' ? 'green' : 'blue'}>{h.remetente}</Badge>
                    <Badge tone="gray">{h.total} destinatário(s) · {h.lidas} lida(s)</Badge>
                    {h.email && <Badge tone="violet"><Mail className="size-3" /> e-mail</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

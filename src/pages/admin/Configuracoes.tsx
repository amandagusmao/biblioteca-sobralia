import { useEffect, useState } from 'react'
import { Check, Database, Download, Mail, MessageCircle, RotateCcw, Save, Send, Settings, ShieldCheck, UserPlus } from 'lucide-react'
import {
  Alert, Avatar, Badge, Button, Card, Field, Input, PageHeader, SearchInput, Select, Tabs, Textarea, useFeedback,
} from '../../components/ui'
import { ROLE_LABEL, useAuth } from '../../lib/auth'
import { DEMO_MODE } from '../../lib/config'
import { adapter, db, DEFAULT_CONFIG, useConfig, useTable } from '../../lib/db'
import { resetDemo } from '../../lib/localAdapter'
import { fmtDate, fmtDateTime, today } from '../../lib/dates'
import { TABLES, type Configuracao, type Role } from '../../lib/types'
import { downloadFile, errMsg, matches } from '../../lib/utils'

export default function Configuracoes() {
  const { user } = useAuth()
  const [aba, setAba] = useState<'geral' | 'usuarios' | 'notificacoes' | 'dados'>('geral')
  return (
    <>
      <PageHeader title="Configurações" icon={<Settings className="size-5" />} subtitle="Informações da biblioteca, regras, equipe, e-mails automáticos e backup." />
      <div className="mb-5">
        <Tabs value={aba} onChange={setAba} items={[
          { value: 'geral', label: 'Biblioteca e regras' },
          ...(user?.role === 'admin' ? [{ value: 'usuarios' as const, label: 'Equipe e acessos' }] : []),
          { value: 'notificacoes', label: 'Notificações' },
          { value: 'dados', label: 'Backup' },
        ]} />
      </div>
      {aba === 'geral' && <Geral />}
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'notificacoes' && <Notificacoes />}
      {aba === 'dados' && <Dados />}
    </>
  )
}

function Geral() {
  const cfg = useConfig()
  const { data: rows } = useTable('configuracoes')
  const { toast } = useFeedback()
  const [f, setF] = useState<Configuracao>(cfg)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => setF(cfg), [cfg])
  const txt = (k: keyof Configuracao) => ({ value: (f[k] as string | number | null) ?? '', onChange: (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: e.target.value })) })

  const salvar = async () => {
    setSalvando(true)
    const patch: Partial<Configuracao> = {
      nome_biblioteca: f.nome_biblioteca || DEFAULT_CONFIG.nome_biblioteca, endereco: f.endereco || null, telefone: f.telefone || null,
      email: f.email || null, horario: f.horario || null, sobre: f.sobre || null,
      prazo_dias: Math.max(1, Number(f.prazo_dias) || 14), max_emprestimos: Math.max(1, Number(f.max_emprestimos) || 3),
      max_renovacoes: Math.max(0, Number(f.max_renovacoes) || 0), tempo_computador: Math.max(5, Number(f.tempo_computador) || 60),
    }
    try {
      if (rows.length) await db.update('configuracoes', 1, patch)
      else await db.insert('configuracoes', { ...patch, id: 1 } as Partial<Configuracao>)
      toast('Configurações salvas.')
    } catch (e) { toast(errMsg(e), 'error') } finally { setSalvando(false) }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 font-extrabold text-navy">Informações públicas</h2>
        <div className="grid gap-4">
          <Field label="Nome da biblioteca"><Input {...txt('nome_biblioteca')} /></Field>
          <Field label="Endereço"><Input {...txt('endereco')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone"><Input {...txt('telefone')} /></Field>
            <Field label="E-mail"><Input {...txt('email')} /></Field>
          </div>
          <Field label="Horário de funcionamento"><Input {...txt('horario')} /></Field>
          <Field label="Sobre a biblioteca" hint="Aparece no rodapé do site"><Textarea {...txt('sobre')} /></Field>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-extrabold text-navy">Regras</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prazo de empréstimo (dias)"><Input type="number" min={1} {...txt('prazo_dias')} /></Field>
          <Field label="Máximo de livros por pessoa"><Input type="number" min={1} {...txt('max_emprestimos')} /></Field>
          <Field label="Máximo de renovações"><Input type="number" min={0} {...txt('max_renovacoes')} /></Field>
          <Field label="Tempo sugerido no computador (min)"><Input type="number" min={5} {...txt('tempo_computador')} /></Field>
        </div>
        <div className="mt-6 flex justify-end"><Button onClick={salvar} loading={salvando} icon={<Save className="size-4" />}>Salvar configurações</Button></div>
      </Card>
    </div>
  )
}

function Usuarios() {
  const { user } = useAuth()
  const [busca, setBusca] = useState('')
  const { toast } = useFeedback()
  const { data: profiles } = useTable('profiles')
  const { data: membros } = useTable('membros')
  const ordenados = [...profiles].sort((a, b) => (a.role === 'leitor' ? 1 : 0) - (b.role === 'leitor' ? 1 : 0) || (a.nome ?? '').localeCompare(b.nome ?? ''))

  const mudar = async (id: string, patch: { role?: Role; membro_id?: string | null }) => {
    try { await db.update('profiles', id, patch); toast('Acesso atualizado.') } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="flex items-center gap-2 font-extrabold text-navy"><UserPlus className="size-5 text-royal" /> Como dar acesso a um professor ou a outro administrador</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>A pessoa cria a conta no site (<b>Entrar → Novo cadastro</b>) com o e-mail dela e confirma pelo link recebido.</li>
          <li>Ela aparece na lista abaixo como <b>Leitor</b>. Mude o perfil para <b>Professor</b> ou <b>Administrador</b>.</li>
          <li>No próximo acesso ela entra direto no painel. Para tirar o acesso, volte o perfil para <b>Leitor</b>.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">Toda conta nova recebe automaticamente a carteirinha. Você não pode alterar o seu próprio perfil, e o sistema sempre mantém pelo menos um administrador.</p>
      </Card>
      <SearchInput value={busca} onChange={setBusca} placeholder="Buscar conta por nome ou e-mail" />
      <Card className="divide-y divide-slate-100">
        {ordenados.filter(p => matches(busca, p.nome, p.email)).slice(0, 100).map(p => (
          <div key={p.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.nome || p.email} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy">{p.nome || '—'} {p.id === user?.id && <Badge tone="blue">você</Badge>}</p>
                <p className="truncate text-sm text-slate-500">{p.email}{p.data_nascimento && ` · nasc. ${fmtDate(p.data_nascimento)}`}</p>
              </div>
            </div>
            <Select value={p.membro_id ?? ''} onChange={e => mudar(p.id, { membro_id: e.target.value || null })} className="md:w-60" title="Cadastro vinculado">
              <option value="">Sem vínculo com carteirinha</option>
              {membros.map(m => <option key={m.id} value={m.id}>{m.nome} · nº {m.carteirinha}</option>)}
            </Select>
            <Select value={p.role} disabled={p.id === user?.id} onChange={e => mudar(p.id, { role: e.target.value as Role })} className="md:w-48">
              {(Object.keys(ROLE_LABEL) as Role[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </div>
        ))}
      </Card>
      <Card className="p-5 text-sm text-slate-600">
        <p className="mb-2 flex items-center gap-2 font-bold text-navy"><ShieldCheck className="size-4 text-royal" /> O que cada perfil pode fazer</p>
        <ul className="list-inside list-disc space-y-1">
          <li><b>Administrador:</b> tudo — acervo, empréstimos, pessoas, computadores, cursos, configurações e equipe (a equipe do balcão usa este perfil).</li>
          <li><b>Professor:</b> cursos, turmas, matrículas, chamada e cadastro de alunos.</li>
          <li><b>Leitor:</b> vê apenas os próprios empréstimos, aulas e carteirinha.</li>
        </ul>
      </Card>
    </div>
  )
}

function Dados() {
  const { toast, confirm } = useFeedback()
  const [exportando, setExportando] = useState(false)
  const exportar = async () => {
    setExportando(true)
    try {
      const out: Record<string, unknown> = { exportado_em: new Date().toISOString() }
      for (const t of TABLES) out[t] = await adapter.list(t)
      downloadFile(`backup-biblioteca-${today()}.json`, JSON.stringify(out, null, 2))
      toast('Backup baixado.')
    } catch (e) { toast(errMsg(e), 'error') } finally { setExportando(false) }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <Database className="size-8 text-royal" />
        <h2 className="mt-3 font-extrabold text-navy">Backup completo</h2>
        <p className="mt-1 text-sm text-slate-600">Baixa todos os dados (livros, pessoas, empréstimos, cursos, frequência...) em um arquivo JSON. Recomendamos fazer isso <b>toda semana</b> e guardar no Google Drive da prefeitura — o plano gratuito do banco não inclui backups automáticos restauráveis.</p>
        <Alert tone="warn">O arquivo contém dados pessoais (inclusive de crianças). Guarde-o somente em local protegido da prefeitura e nunca envie por WhatsApp ou e-mail pessoal.</Alert>
        <Button className="mt-5" onClick={exportar} loading={exportando} icon={<Download className="size-4" />}>Baixar backup</Button>
      </Card>
      {DEMO_MODE && (
        <Card className="p-6">
          <RotateCcw className="size-8 text-amber-500" />
          <h2 className="mt-3 font-extrabold text-navy">Restaurar demonstração</h2>
          <p className="mt-1 text-sm text-slate-600">Apaga as alterações feitas neste navegador e volta aos dados fictícios iniciais.</p>
          <Button className="mt-5" variant="secondary" icon={<RotateCcw className="size-4" />} onClick={async () => {
            if (await confirm({ title: 'Restaurar dados de demonstração?', msg: 'Todas as alterações feitas neste navegador serão perdidas.', danger: true, okLabel: 'Restaurar' })) { resetDemo(); location.reload() }
          }}>Restaurar</Button>
        </Card>
      )}
    </div>
  )
}

/** Status dos e-mails automáticos (Brevo) e fila de envios. */
function Notificacoes() {
  const { toast } = useFeedback()
  const cfg = useConfig()
  const { data: fila, reload } = useTable('fila_emails')
  const [configurado, setConfigurado] = useState<boolean | null>(null)
  const [testando, setTestando] = useState(false)
  useEffect(() => { db.rpc<boolean>('email_configurado', {}).then(setConfigurado).catch(() => setConfigurado(false)) }, [])

  const conta = (s: string) => fila.filter(f => f.status === s).length
  const hoje = fila.filter(f => f.status === 'enviado' && f.enviado_em && Date.now() - new Date(f.enviado_em).getTime() < 86_400_000).length
  const testar = async () => {
    setTestando(true)
    try { const r = await db.rpc<string>('enviar_email_teste', {}, ['fila_emails']); toast(String(r ?? 'Teste enfileirado'), 'info'); reload() }
    catch (e) { toast(errMsg(e), 'error') } finally { setTestando(false) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card className="p-6">
        <Mail className="size-8 text-royal" />
        <h2 className="mt-3 font-extrabold text-navy">E-mails automáticos</h2>
        <div className="mt-3">
          {DEMO_MODE ? <Alert tone="warn">Modo demonstração: os e-mails ficam só na fila abaixo, nada é enviado de verdade.</Alert>
            : configurado === null ? <Alert tone="info">Verificando...</Alert>
              : configurado ? <Alert tone="success">Configurado. Remetente: <b>{cfg.email}</b></Alert>
                : <Alert tone="warn">Ainda não configurado. Os e-mails ficam guardados na fila e serão enviados assim que você configurar (veja o passo a passo no guia de instalação — README, seção “E-mails automáticos”).</Alert>}
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-leaf-dark" /> Aviso de <b>livro atrasado</b>: todo dia às 9h, repetindo a cada 3 dias enquanto não devolver.</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-leaf-dark" /> <b>Inscrição aprovada</b>, com dias, horário e local das aulas (ou recusada, com o motivo).</li>
          <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-leaf-dark" /> <b>Mensagens</b> da equipe, quando marcada a opção “enviar por e-mail”.</li>
          <li className="flex gap-2"><MessageCircle className="mt-0.5 size-4 shrink-0 text-leaf-dark" /> <span><b>WhatsApp</b>: pela Central de avisos do Painel, com um clique e a mensagem pronta. (O envio 100% automático pelo WhatsApp só existe na API oficial do Meta, que é paga por mensagem.)</span></li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">Limite gratuito do Brevo: 300 e-mails por dia — o sistema respeita esse limite automaticamente.</p>
        {!DEMO_MODE && <Button className="mt-5" variant="secondary" onClick={testar} loading={testando} icon={<Send className="size-4" />}>Enviar e-mail de teste para mim</Button>}
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-4">
          <h2 className="mr-auto font-extrabold text-navy">Fila de e-mails</h2>
          <Badge tone="amber">{conta('pendente') + conta('enviando')} aguardando</Badge>
          <Badge tone="green">{hoje} enviados (24h)</Badge>
          {conta('erro') > 0 && <Badge tone="red">{conta('erro')} com erro</Badge>}
        </div>
        {fila.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum e-mail na fila.</p> : (
          <ul className="scrollbar-thin max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
            {[...fila].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100).map(f => (
              <li key={f.id} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy">{f.assunto}</p>
                  <p className="truncate text-xs text-slate-500">{f.nome} · {f.para}</p>
                  {f.erro && <p className="truncate text-xs text-red-600" title={f.erro}>{f.erro}</p>}
                </div>
                <div className="text-right">
                  <Badge tone={f.status === 'enviado' ? 'green' : f.status === 'erro' ? 'red' : 'amber'}>{f.status}</Badge>
                  <p className="mt-0.5 text-[11px] text-slate-400">{fmtDateTime(f.enviado_em ?? f.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

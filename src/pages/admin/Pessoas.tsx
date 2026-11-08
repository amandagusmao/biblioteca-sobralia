import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Download, GraduationCap, IdCard, MessageCircle, Pencil, Printer, Trash2, UserPlus, Users } from 'lucide-react'
import { Carteirinha } from '../../components/Carteirinha'
import {
  Alert, Avatar, Badge, Button, Card, DateInput, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, SearchInput, Spinner, Tabs, Textarea, useFeedback,
} from '../../components/ui'
import { isBalcao, useAuth } from '../../lib/auth'
import { db, useTable } from '../../lib/db'
import { fmtDate, idade, relativeDue, today } from '../../lib/dates'
import { ESCALA } from '../../lib/services'
import type { Membro } from '../../lib/types'
import { digits, downloadFile, errMsg, fmtPhone, matches, toCSV, whatsappLink } from '../../lib/utils'

export default function Pessoas() {
  const { user } = useAuth()
  const balcao = isBalcao(user?.role)
  const { data: membros, loading, error } = useTable('membros')
  const { data: emps } = useTable('emprestimos')
  const { data: mats } = useTable('matriculas')
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'criancas' | 'alunos' | 'inativos'>('todos')
  const [form, setForm] = useState<Partial<Membro> | null>(null)
  const [ver, setVer] = useState<Membro | null>(null)

  const alunosIds = useMemo(() => new Set(mats.filter(m => m.status === 'ativa').map(m => m.membro_id)), [mats])
  const lista = useMemo(() => membros
    .filter(m => matches(q, m.nome, m.carteirinha, m.telefone, m.responsavel_nome, m.email))
    .filter(m => filtro === 'inativos' ? !m.ativo : filtro === 'criancas' ? (idade(m.data_nascimento) ?? 99) < 18 : filtro === 'alunos' ? alunosIds.has(m.id) : true)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [membros, q, filtro, alunosIds])

  const verAtual = ver ? membros.find(m => m.id === ver.id) ?? null : null

  return (
    <>
      <PageHeader title={balcao ? 'Leitores e alunos' : 'Alunos'} icon={<Users className="size-5" />}
        subtitle={balcao ? 'Cadastro único: a mesma pessoa pode pegar livros, usar computadores e fazer cursos.' : 'Alunos matriculados ou inscritos nos cursos. Para cadastrar um aluno novo, use a página da turma.'}
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => downloadFile(`pessoas-${today()}.csv`, toCSV(membros.map(m => ({
            carteirinha: m.carteirinha, nome: m.nome, nascimento: fmtDate(m.data_nascimento), telefone: fmtPhone(m.telefone),
            responsavel: m.responsavel_nome, tel_responsavel: fmtPhone(m.responsavel_telefone), email: m.email, ativo: m.ativo ? 'sim' : 'não',
          }))), 'text/csv')}>CSV</Button>
          {balcao && <Button icon={<UserPlus className="size-4" />} onClick={() => setForm({ ativo: true })}>Novo cadastro</Button>}
        </>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Nome, carteirinha, telefone, responsável..." className="flex-1" />
        <Tabs value={filtro} onChange={setFiltro} items={[
          { value: 'todos', label: 'Todos', count: membros.length },
          { value: 'criancas', label: 'Menores de 18' },
          ...(balcao ? [{ value: 'alunos' as const, label: 'Alunos', count: alunosIds.size }] : []),
          { value: 'inativos', label: 'Inativos' },
        ]} />
      </Card>

      {error ? <ErrorBox msg={error} /> : loading ? <Spinner /> : lista.length === 0 ? (
        <Card><EmptyState icon={<Users className="size-7" />} title="Ninguém encontrado" action={<Button icon={<UserPlus className="size-4" />} onClick={() => setForm({ ativo: true })}>Novo cadastro</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map(m => {
            const id = idade(m.data_nascimento)
            const comigo = emps.filter(e => e.membro_id === m.id && !e.data_devolucao).length
            return (
              <button key={m.id} onClick={() => setVer(m)} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-royal/30">
                <Avatar name={m.nome} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy">{m.nome}</p>
                  <p className="text-sm text-slate-500">Nº {m.carteirinha}{id !== null && ` · ${id} anos`}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!m.ativo && <Badge tone="gray">Inativo</Badge>}
                    {id !== null && id < 18 && <Badge tone="amber">Menor</Badge>}
                    {alunosIds.has(m.id) && <Badge tone="violet"><GraduationCap className="size-3" /> Aluno</Badge>}
                    {balcao && comigo > 0 && <Badge tone="blue"><BookOpen className="size-3" /> {comigo}</Badge>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <PessoaForm rascunho={form} onClose={() => setForm(null)} onSaved={() => setForm(null)} />
      <PessoaDetalhe membro={verAtual} onClose={() => setVer(null)} onEdit={m => { setVer(null); setForm(m) }} />
    </>
  )
}

export function PessoaForm({ rascunho, onClose, onSaved }: { rascunho: Partial<Membro> | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { toast } = useFeedback()
  const [f, setF] = useState<Partial<Membro>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => { if (rascunho) { setF(rascunho); setErro(null) } }, [rascunho])

  const txt = (k: keyof Membro) => ({ value: (f[k] as string | null | undefined) ?? '', onChange: (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: e.target.value })) })
  const menor = (idade(f.data_nascimento ?? null) ?? 99) < 18

  const salvar = async () => {
    setErro(null)
    if (!f.nome?.trim()) return setErro('Informe o nome completo.')
    if (menor && !f.responsavel_nome?.trim()) return setErro('Para menores de 18 anos, informe o responsável.')
    const email = f.email?.trim().toLowerCase() || null
    const row: Partial<Membro> = {
      nome: f.nome.trim(), data_nascimento: f.data_nascimento || null, telefone: digits(f.telefone) || null, telefone_whatsapp: !!digits(f.telefone) && !!f.telefone_whatsapp,
      email, endereco: f.endereco?.trim() || null, responsavel_nome: f.responsavel_nome?.trim() || null,
      responsavel_telefone: digits(f.responsavel_telefone) || null, observacoes: f.observacoes?.trim() || null, ativo: f.ativo ?? true,
    }
    setSalvando(true)
    try {
      let id = f.id
      if (id) await db.update('membros', id, row)
      else id = await db.insert('membros', { ...row, created_at: new Date().toISOString() }) // carteirinha numerada pelo banco
      toast(f.id ? 'Cadastro atualizado.' : `${row.nome} cadastrado(a)!`)
      onSaved(id)
    } catch (e) {
      setErro(errMsg(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={!!rascunho} onClose={onClose} size="lg" title={f.id ? 'Editar cadastro' : 'Novo cadastro'}
      subtitle={f.carteirinha ? `Carteirinha nº ${f.carteirinha}` : 'A carteirinha é gerada automaticamente.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" required className="sm:col-span-2"><Input {...txt('nome')} autoFocus /></Field>
        <Field label="Data de nascimento"><DateInput value={f.data_nascimento} onChange={v => setF(x => ({ ...x, data_nascimento: v }))} /></Field>
        <Field label="Telefone">
          <Input {...txt('telefone')} inputMode="tel" placeholder="(33) 9 9999-9999" />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!f.telefone_whatsapp} onChange={e => setF(x => ({ ...x, telefone_whatsapp: e.target.checked }))} className="size-4 accent-leaf" /> Tem WhatsApp
          </label>
        </Field>
        <Field label="E-mail" hint="Use o mesmo e-mail da conta no site para a pessoa ver seus empréstimos"><Input type="email" {...txt('email')} /></Field>
        <Field label="Endereço" className="sm:col-span-2"><Input {...txt('endereco')} placeholder="Rua, número, bairro" /></Field>
        <div className={`grid gap-4 rounded-2xl p-4 sm:col-span-2 sm:grid-cols-2 ${menor ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50'}`}>
          <p className="text-sm font-bold text-slate-700 sm:col-span-2">Responsável {menor ? '(obrigatório — menor de idade)' : '(para menores de idade)'}</p>
          <Field label="Nome do responsável"><Input {...txt('responsavel_nome')} /></Field>
          <Field label="Telefone do responsável"><Input {...txt('responsavel_telefone')} inputMode="tel" /></Field>
        </div>
        <Field label="Observações" className="sm:col-span-2"><Textarea {...txt('observacoes')} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={f.ativo ?? true} onChange={e => setF(x => ({ ...x, ativo: e.target.checked }))} className="size-4 accent-royal" /> Cadastro ativo
        </label>
        {erro && <div className="sm:col-span-2"><Alert tone="error">{erro}</Alert></div>}
      </div>
    </Modal>
  )
}

function PessoaDetalhe({ membro, onClose, onEdit }: { membro: Membro | null; onClose: () => void; onEdit: (m: Membro) => void }) {
  const { user } = useAuth()
  const balcao = isBalcao(user?.role)
  const { toast, confirm } = useFeedback()
  const { data: emps } = useTable('emprestimos')
  const { data: livros } = useTable('livros')
  const { data: mats } = useTable('matriculas')
  const { data: turmas } = useTable('turmas')
  const { data: cursos } = useTable('cursos')
  const { data: avaliacoes } = useTable('avaliacoes')
  const [aba, setAba] = useState<'dados' | 'livros' | 'cursos' | 'desempenho' | 'carteirinha'>('dados')
  useEffect(() => { setAba('dados') }, [membro?.id])
  if (!membro) return null

  const meus = emps.filter(e => e.membro_id === membro.id).sort((a, b) => b.data_emprestimo.localeCompare(a.data_emprestimo))
  const minhasMats = mats.filter(m => m.membro_id === membro.id)
  const id = idade(membro.data_nascimento)
  const tel = membro.telefone || membro.responsavel_telefone
  const wa = whatsappLink(tel, `Olá! Aqui é da Biblioteca Digital de Sobrália.`)

  const excluir = async () => {
    if (meus.some(e => !e.data_devolucao)) { toast('Esta pessoa tem livros emprestados. Registre as devoluções antes.', 'error'); return }
    if (!(await confirm({ title: 'Excluir cadastro?', msg: <>O cadastro de <b>{membro.nome}</b>, histórico de empréstimos, matrículas e frequência serão apagados. Para manter o histórico, prefira marcar como <b>inativo</b>.</>, danger: true, okLabel: 'Excluir' }))) return
    try { await db.remove('membros', membro.id); toast('Cadastro excluído.'); onClose() } catch (e) { toast(errMsg(e), 'error') }
  }

  const info: [string, string | null][] = [
    ['Carteirinha', membro.carteirinha], ['Nascimento', membro.data_nascimento ? `${fmtDate(membro.data_nascimento)} (${id} anos)` : null],
    ['Telefone', membro.telefone ? `${fmtPhone(membro.telefone)}${membro.telefone_whatsapp ? ' (WhatsApp)' : ''}` : null], ['E-mail', membro.email], ['Endereço', membro.endereco],
    ['Responsável', membro.responsavel_nome], ['Tel. responsável', fmtPhone(membro.responsavel_telefone) || null],
    ['Cadastrado em', fmtDate(membro.created_at)], ['Observações', membro.observacoes],
  ]

  return (
    <Modal open onClose={onClose} size="lg" title={membro.nome} subtitle={`Carteirinha nº ${membro.carteirinha}${membro.ativo ? '' : ' · INATIVO'}`}
      footer={<>
        {balcao && <Button variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={excluir}>Excluir</Button>}
        {wa && <a href={wa} target="_blank" rel="noreferrer"><Button variant="secondary" icon={<MessageCircle className="size-4" />}>WhatsApp</Button></a>}
        <Button icon={<Pencil className="size-4" />} onClick={() => onEdit(membro)}>Editar</Button>
      </>}>
      <Tabs value={aba} onChange={setAba} items={[
        { value: 'dados', label: 'Dados' },
        ...(balcao ? [{ value: 'livros' as const, label: 'Empréstimos', count: meus.length }] : []),
        { value: 'cursos', label: 'Cursos', count: minhasMats.length },
        { value: 'desempenho', label: 'Desempenho', count: avaliacoes.filter(a => a.membro_id === membro.id).length },
        { value: 'carteirinha', label: <span className="flex items-center gap-1"><IdCard className="size-4" /> Carteirinha</span> },
      ]} />
      <div className="mt-5">
        {aba === 'dados' && (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {info.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt><dd className="font-medium text-slate-700">{v}</dd></div>
            ))}
          </dl>
        )}
        {aba === 'livros' && (meus.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Nenhum empréstimo ainda.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {meus.map(e => {
              const r = relativeDue(e.data_prevista)
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-semibold text-navy">{livros.find(l => l.id === e.livro_id)?.titulo ?? '—'}</p>
                    <p className="text-slate-500">{fmtDate(e.data_emprestimo)} → {e.data_devolucao ? `devolvido ${fmtDate(e.data_devolucao)}` : `prazo ${fmtDate(e.data_prevista)}`}</p>
                  </div>
                  {e.data_devolucao ? <Badge tone="gray">Devolvido</Badge> : <Badge tone={r.tone}>{r.label}</Badge>}
                </li>
              )
            })}
          </ul>
        ))}
        {aba === 'cursos' && (minhasMats.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Não está matriculado(a) em nenhuma turma.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {minhasMats.map(m => {
              const t = turmas.find(x => x.id === m.turma_id)
              return (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold text-navy">{cursos.find(c => c.id === t?.curso_id)?.nome} — {t?.nome}</span>
                  <Badge tone={m.status === 'ativa' ? 'green' : 'gray'}>{m.status}</Badge>
                </li>
              )
            })}
          </ul>
        ))}
        {aba === 'desempenho' && (() => {
          const avs = avaliacoes.filter(a => a.membro_id === membro.id).sort((a, b) => b.data.localeCompare(a.data))
          if (!avs.length) return <p className="py-8 text-center text-sm text-slate-500">Nenhuma anotação de desempenho ainda. Registre pela página da turma.</p>
          return (
            <ul className="space-y-3">
              {avs.map(a => (
                <li key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-navy">{fmtDate(a.data)}</span>
                    <span className="text-slate-400">· {cursos.find(c => c.id === turmas.find(t => t.id === a.turma_id)?.curso_id)?.nome}</span>
                    {a.desempenho && <Badge tone={ESCALA[a.desempenho].tone}>Desempenho: {ESCALA[a.desempenho].label}</Badge>}
                    {a.comportamento && <Badge tone={ESCALA[a.comportamento].tone}>Comportamento: {ESCALA[a.comportamento].label}</Badge>}
                  </div>
                  {a.observacao && <p className="mt-1.5 text-slate-600">{a.observacao}</p>}
                  {a.autor_nome && <p className="mt-1 text-xs text-slate-400">por {a.autor_nome}</p>}
                </li>
              ))}
            </ul>
          )
        })()}
        {aba === 'carteirinha' && (
          <div className="flex flex-col items-center gap-4">
            <div className="print-area"><Carteirinha membro={membro} /></div>
            <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir carteirinha</Button>
            {!membro.email && <Alert tone="info">Cadastre um e-mail para que a pessoa possa acompanhar seus empréstimos pelo site.</Alert>}
          </div>
        )}
      </div>
    </Modal>
  )
}

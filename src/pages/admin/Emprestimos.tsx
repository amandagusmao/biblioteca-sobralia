import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, CalendarPlus, CornerDownLeft, Download, MessageCircle, Plus, ScanLine, UserPlus } from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import { lerCarteirinha } from '../../components/Carteirinha'
import { ScannerModal } from '../../components/Scanner'
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, SearchInput, SearchSelect, Spinner, Tabs, useFeedback,
} from '../../components/ui'
import { db, useConfig, useTable } from '../../lib/db'
import { addDays, fmtDate, relativeDue, today } from '../../lib/dates'
import { toIsbn13 } from '../../lib/isbn'
import { atrasado, checarEmprestimo, devolver, disponiveis, emprestar, podeRenovar, renovar } from '../../lib/services'
import type { Emprestimo } from '../../lib/types'
import { downloadFile, errMsg, matches, toCSV, whatsappLink } from '../../lib/utils'
import { PessoaForm } from './Pessoas'

type Aba = 'ativos' | 'atrasados' | 'devolvidos' | 'todos'

export default function Emprestimos() {
  const cfg = useConfig()
  const { toast, confirm } = useFeedback()
  const { data: emps, loading, error } = useTable('emprestimos')
  const { data: livros } = useTable('livros')
  const { data: membros } = useTable('membros')
  const [params, setParams] = useSearchParams()
  const [aba, setAba] = useState<Aba>((params.get('aba') as Aba) || 'ativos')
  const [q, setQ] = useState('')
  const [novo, setNovo] = useState(false)
  const [scanDev, setScanDev] = useState(false)

  useEffect(() => {
    if (params.get('novo')) { setNovo(true); params.delete('novo'); setParams(params, { replace: true }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const livro = (id: string) => livros.find(l => l.id === id)
  const membro = (id: string) => membros.find(m => m.id === id)

  const contagem = {
    ativos: emps.filter(e => !e.data_devolucao).length,
    atrasados: emps.filter(atrasado).length,
    devolvidos: emps.filter(e => e.data_devolucao).length,
  }

  const lista = useMemo(() => emps
    .filter(e => aba === 'todos' ? true : aba === 'ativos' ? !e.data_devolucao : aba === 'atrasados' ? atrasado(e) : !!e.data_devolucao)
    .filter(e => { const l = livro(e.livro_id); const m = membro(e.membro_id); return matches(q, l?.titulo, l?.isbn, l?.codigo_interno, m?.nome, m?.carteirinha) })
    .sort((a, b) => aba === 'devolvidos' ? (b.data_devolucao ?? '').localeCompare(a.data_devolucao ?? '') : aba === 'todos' ? b.data_emprestimo.localeCompare(a.data_emprestimo) : a.data_prevista.localeCompare(b.data_prevista)),
  [emps, aba, q, livros, membros]) // eslint-disable-line react-hooks/exhaustive-deps

  const doDevolver = async (e: Emprestimo) => {
    try { await devolver(e); toast(`Devolução registrada: "${livro(e.livro_id)?.titulo}".`) } catch (err) { toast(errMsg(err), 'error') }
  }
  const doRenovar = async (e: Emprestimo) => {
    const motivo = podeRenovar(e, cfg)
    if (motivo) { toast(motivo, 'error'); return }
    if (!(await confirm({ title: 'Renovar empréstimo?', msg: <>Novo prazo: <b>{fmtDate(addDays(e.data_prevista > today() ? e.data_prevista : today(), cfg.prazo_dias))}</b> ({e.renovacoes + 1}ª renovação de {cfg.max_renovacoes}).</>, okLabel: 'Renovar' }))) return
    try { await renovar(e, cfg); toast('Empréstimo renovado.') } catch (err) { toast(errMsg(err), 'error') }
  }

  /** Devolução rápida: escaneia o livro e encontra o empréstimo em aberto. */
  const devolucaoPorCodigo = async (code: string) => {
    setScanDev(false)
    const isbn = toIsbn13(code)
    const l = livros.find(x => (isbn && x.isbn === isbn) || x.codigo_interno?.toUpperCase() === code.trim().toUpperCase())
    if (!l) { toast('Livro não encontrado no acervo.', 'error'); return }
    const abertos = emps.filter(e => e.livro_id === l.id && !e.data_devolucao)
    if (abertos.length === 0) { toast(`"${l.titulo}" não tem empréstimo em aberto.`, 'info'); return }
    if (abertos.length > 1) { setAba('ativos'); setQ(l.titulo); toast('Há mais de um exemplar emprestado — escolha na lista.', 'info'); return }
    const e = abertos[0]
    if (await confirm({ title: 'Registrar devolução?', msg: <>"<b>{l.titulo}</b>" emprestado para <b>{membro(e.membro_id)?.nome}</b>.</>, okLabel: 'Confirmar devolução' })) doDevolver(e)
  }

  const exportar = () => downloadFile(`emprestimos-${today()}.csv`, toCSV(emps.map(e => ({
    livro: livro(e.livro_id)?.titulo, pessoa: membro(e.membro_id)?.nome, carteirinha: membro(e.membro_id)?.carteirinha,
    emprestado_em: fmtDate(e.data_emprestimo), prazo: fmtDate(e.data_prevista), devolvido_em: fmtDate(e.data_devolucao),
    renovacoes: e.renovacoes, situacao: e.data_devolucao ? 'devolvido' : atrasado(e) ? 'atrasado' : 'em dia',
  }))), 'text/csv')

  return (
    <>
      <PageHeader title="Empréstimos" icon={<ArrowLeftRight className="size-5" />}
        subtitle={`Prazo padrão de ${cfg.prazo_dias} dias · até ${cfg.max_emprestimos} livros por pessoa`}
        actions={<>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportar}>CSV</Button>
          <Button variant="secondary" icon={<CornerDownLeft className="size-4" />} onClick={() => setScanDev(true)}>Devolução rápida</Button>
          <Button icon={<Plus className="size-4" />} onClick={() => setNovo(true)}>Novo empréstimo</Button>
        </>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <Tabs value={aba} onChange={setAba} items={[
          { value: 'ativos', label: 'Em aberto', count: contagem.ativos },
          { value: 'atrasados', label: 'Atrasados', count: contagem.atrasados },
          { value: 'devolvidos', label: 'Devolvidos', count: contagem.devolvidos },
          { value: 'todos', label: 'Todos' },
        ]} />
        <SearchInput value={q} onChange={setQ} placeholder="Buscar livro ou pessoa" className="flex-1" />
      </Card>

      {error ? <ErrorBox msg={error} /> : loading ? <Spinner /> : lista.length === 0 ? (
        <Card><EmptyState icon={<ArrowLeftRight className="size-7" />} title={aba === 'atrasados' ? 'Nenhum atraso 🎉' : 'Nenhum empréstimo aqui'} /></Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {lista.map(e => {
            const l = livro(e.livro_id)
            const m = membro(e.membro_id)
            const r = relativeDue(e.data_prevista)
            const tel = m?.telefone || m?.responsavel_telefone
            const wa = !e.data_devolucao && whatsappLink(tel, `Olá! Aqui é da ${cfg.nome_biblioteca}. Lembrete: o livro "${l?.titulo}" ${atrasado(e) ? 'deveria ter sido devolvido' : 'deve ser devolvido'} em ${fmtDate(e.data_prevista)}${m?.responsavel_nome ? ` (emprestado para ${m.nome.split(' ')[0]})` : ''}. Obrigado!`)
            return (
              <div key={e.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {l && <BookCover livro={l} size="sm" className="w-10 shrink-0" />}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy">{l?.titulo ?? 'Livro removido'}</p>
                    <p className="truncate text-sm text-slate-500">{m?.nome ?? '—'} · nº {m?.carteirinha}</p>
                    <p className="text-xs text-slate-400">
                      Saiu {fmtDate(e.data_emprestimo)} · prazo {fmtDate(e.data_prevista)}
                      {e.renovacoes > 0 && ` · ${e.renovacoes} renovação(ões)`}
                      {e.data_devolucao && ` · devolvido ${fmtDate(e.data_devolucao)}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {e.data_devolucao ? <Badge tone="gray">Devolvido</Badge> : <Badge tone={r.tone}>{r.label}</Badge>}
                  {wa && <a href={wa} target="_blank" rel="noreferrer" onClick={() => { db.update('emprestimos', e.id, { whatsapp_avisado_em: new Date().toISOString() }).catch(() => {}) }}
                    title={e.whatsapp_avisado_em ? `Avisado pelo WhatsApp em ${fmtDate(e.whatsapp_avisado_em.slice(0, 10))}` : 'Lembrar pelo WhatsApp'}
                    className={`rounded-lg p-2 hover:bg-lime-50 ${e.whatsapp_avisado_em ? 'text-slate-400' : 'text-leaf-dark'}`}><MessageCircle className="size-5" /></a>}
                  {e.ultimo_aviso_em && !e.data_devolucao && <span className="hidden text-xs text-slate-400 lg:inline" title="Aviso automático (mensagem/e-mail)">avisado {fmtDate(e.ultimo_aviso_em.slice(0, 10))}</span>}
                  {!e.data_devolucao && <>
                    <Button size="sm" variant="secondary" icon={<CalendarPlus className="size-4" />} onClick={() => doRenovar(e)}>Renovar</Button>
                    <Button size="sm" variant="success" icon={<CornerDownLeft className="size-4" />} onClick={() => doDevolver(e)}>Devolver</Button>
                  </>}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <NovoEmprestimo open={novo} onClose={() => setNovo(false)} />
      <ScannerModal open={scanDev} onClose={() => setScanDev(false)} onResult={devolucaoPorCodigo} title="Devolução rápida" hint="Escaneie o ISBN ou a etiqueta do livro devolvido" />
    </>
  )
}

function NovoEmprestimo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cfg = useConfig()
  const { toast } = useFeedback()
  const { data: livros } = useTable('livros')
  const { data: membros } = useTable('membros')
  const { data: emps } = useTable('emprestimos')
  const [membroId, setMembroId] = useState<string | null>(null)
  const [livroId, setLivroId] = useState<string | null>(null)
  const [prazo, setPrazo] = useState('')
  const [scan, setScan] = useState<'membro' | 'livro' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [novaPessoa, setNovaPessoa] = useState<object | null>(null)

  useEffect(() => { if (open) { setMembroId(null); setLivroId(null); setPrazo(addDays(today(), cfg.prazo_dias)) } }, [open, cfg.prazo_dias])

  const membro = membros.find(m => m.id === membroId)
  const livro = livros.find(l => l.id === livroId)
  const alertas = checarEmprestimo(livro, membro, emps, cfg)
  const bloqueado = alertas.some(a => a.tipo === 'erro')

  const lido = (code: string) => {
    const tipo = scan
    setScan(null)
    if (tipo === 'membro') {
      const c = lerCarteirinha(code)
      const m = membros.find(x => x.carteirinha === c)
      if (m) setMembroId(m.id); else toast('Carteirinha não encontrada.', 'error')
    } else {
      const isbn = toIsbn13(code)
      const l = livros.find(x => (isbn && x.isbn === isbn) || x.codigo_interno?.toUpperCase() === code.trim().toUpperCase())
      if (l) setLivroId(l.id); else toast('Livro não encontrado no acervo. Cadastre-o primeiro.', 'error')
    }
  }

  const salvar = async () => {
    if (!membro || !livro || bloqueado) return
    setSalvando(true)
    try {
      await emprestar(livro.id, membro.id, prazo)
      toast(`"${livro.titulo}" emprestado para ${membro.nome.split(' ')[0]} até ${fmtDate(prazo)}.`)
      onClose()
    } catch (e) {
      toast(errMsg(e), 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <Modal open={open && !scan && !novaPessoa} onClose={onClose} title="Novo empréstimo" size="md"
        footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando} disabled={!membro || !livro || bloqueado}>Confirmar empréstimo</Button></>}>
        <div className="space-y-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">1. Quem está levando?</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setNovaPessoa({ ativo: true })} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-royal hover:bg-royal/5"><UserPlus className="size-3.5" /> Cadastrar</button>
                <button type="button" onClick={() => setScan('membro')} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-royal hover:bg-royal/5"><ScanLine className="size-3.5" /> Carteirinha</button>
              </div>
            </div>
            <SearchSelect items={membros.filter(m => m.ativo)} value={membroId} onChange={setMembroId}
              getLabel={m => m.nome} getSearch={m => `${m.nome} ${m.carteirinha} ${m.responsavel_nome ?? ''}`}
              placeholder="Nome ou nº da carteirinha"
              render={m => <div className="flex items-center gap-2"><Avatar name={m.nome} className="size-7 text-[10px]" /><div><p className="font-semibold text-navy">{m.nome}</p><p className="text-xs text-slate-500">Nº {m.carteirinha}{m.responsavel_nome && ` · resp. ${m.responsavel_nome}`}</p></div></div>} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">2. Qual livro?</span>
              <button type="button" onClick={() => setScan('livro')} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-royal hover:bg-royal/5"><ScanLine className="size-3.5" /> Escanear livro</button>
            </div>
            <SearchSelect items={livros} value={livroId} onChange={setLivroId}
              getLabel={l => l.titulo} getSearch={l => `${l.titulo} ${l.autores ?? ''} ${l.isbn ?? ''} ${l.codigo_interno ?? ''}`}
              placeholder="Título, autor, ISBN ou código"
              render={l => (
                <div className="flex items-center gap-2">
                  <BookCover livro={l} size="sm" className="w-7 shrink-0" />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold text-navy">{l.titulo}</p><p className="truncate text-xs text-slate-500">{l.autores}</p></div>
                  <Badge tone={disponiveis(l) > 0 ? 'green' : 'red'}>{disponiveis(l)}/{l.quantidade}</Badge>
                </div>
              )} />
          </div>

          <Field label="3. Devolver até">
            <Input type="date" value={prazo} min={today()} onChange={e => setPrazo(e.target.value)} />
          </Field>

          {alertas.map((a, i) => <Alert key={i} tone={a.tipo === 'erro' ? 'error' : 'warn'}>{a.msg}</Alert>)}
        </div>
      </Modal>
      <ScannerModal open={!!scan} onClose={() => setScan(null)} onResult={lido}
        title={scan === 'membro' ? 'Ler carteirinha' : 'Escanear livro'}
        hint={scan === 'membro' ? 'Aponte para o QR Code da carteirinha' : 'Aponte para o ISBN ou etiqueta do livro'} />
      <PessoaForm rascunho={novaPessoa} onClose={() => setNovaPessoa(null)} onSaved={id => { setNovaPessoa(null); setMembroId(id) }} />
    </>
  )
}

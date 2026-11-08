import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookCopy, Download, Keyboard, Pencil, PenLine, Printer, ScanLine, Search, Tag, Trash2 } from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import { QrCode } from '../../components/QrCode'
import { ScannerModal } from '../../components/Scanner'
import {
  Alert, Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, SearchInput, Select, Spinner, Textarea, useFeedback,
} from '../../components/ui'
import { db, useTable } from '../../lib/db'
import { buscarIsbn, cleanIsbn, fmtIsbn, toIsbn13 } from '../../lib/isbn'
import { CATEGORIAS, disponiveis, proximoCodigoInterno } from '../../lib/services'
import type { Livro } from '../../lib/types'
import { cn, downloadFile, errMsg, matches, toCSV } from '../../lib/utils'
import { today } from '../../lib/dates'

type Rascunho = Partial<Livro>

export default function Livros() {
  const { data: livros, loading, error } = useTable('livros')
  const { toast, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [origem, setOrigem] = useState('')
  const [scan, setScan] = useState(false)
  const [continuo, setContinuo] = useState(false)
  const [form, setForm] = useState<Rascunho | null>(null)
  const [etiqueta, setEtiqueta] = useState<Livro | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const n = params.get('novo')
    if (n === 'scan') setScan(true)
    if (n) { params.delete('novo'); setParams(params, { replace: true }) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => livros
    .filter(l => matches(q, l.titulo, l.autores, l.isbn, l.codigo_interno, l.categoria, l.editora, l.localizacao))
    .filter(l => !origem || l.origem === origem)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')), [livros, q, origem])

  /** Fluxo do ISBN: já existe? soma exemplar. Senão busca dados e abre o formulário. */
  const processarCodigo = async (code: string) => {
    setScan(false)
    const isbn = toIsbn13(code)
    const existente = livros.find(l => (isbn && l.isbn === isbn) || (l.codigo_interno && l.codigo_interno.toUpperCase() === code.trim().toUpperCase()))
    if (existente) {
      const ok = await confirm({
        title: 'Livro já cadastrado',
        msg: <>"<b>{existente.titulo}</b>" já está no acervo com {existente.quantidade} exemplar(es). Deseja adicionar mais 1 exemplar?</>,
        okLabel: 'Adicionar exemplar',
      })
      if (ok) {
        await db.update('livros', existente.id, { quantidade: existente.quantidade + 1 })
        toast(`Agora são ${existente.quantidade + 1} exemplares de "${existente.titulo}".`)
      }
      if (continuo) setScan(true)
      return
    }
    if (!isbn) {
      toast(`"${code}" não é um ISBN válido. Confira o número ou use o cadastro manual.`, 'error')
      setForm({ origem: 'isbn', isbn: cleanIsbn(code), quantidade: 1 })
      return
    }
    setBuscando(true)
    const r = await buscarIsbn(isbn)
    setBuscando(false)
    if (r) toast(`Dados encontrados em: ${r.fontes.join(', ')}`, 'info')
    else toast('ISBN não encontrado nas bases públicas. Preencha os dados manualmente.', 'info')
    setForm({ origem: 'isbn', isbn, quantidade: 1, idioma: 'Português', ...(r?.dados ?? {}) })
  }

  const excluir = async (l: Livro) => {
    if (l.emprestados > 0) { toast('Este livro tem exemplares emprestados. Registre as devoluções antes de excluir.', 'error'); return }
    if (!(await confirm({ title: 'Excluir livro?', msg: <>"{l.titulo}" e seu histórico de empréstimos serão removidos.</>, danger: true, okLabel: 'Excluir' }))) return
    try { await db.remove('livros', l.id); toast('Livro excluído.') } catch (e) { toast(errMsg(e), 'error') }
  }

  const exportar = () => downloadFile(`acervo-${today()}.csv`, toCSV(livros.map(l => ({
    titulo: l.titulo, autores: l.autores, isbn: l.isbn, codigo: l.codigo_interno, editora: l.editora, ano: l.ano,
    categoria: l.categoria, localizacao: l.localizacao, exemplares: l.quantidade, emprestados: l.emprestados,
  }))), 'text/csv')

  return (
    <>
      <PageHeader title="Acervo de livros" icon={<BookCopy className="size-5" />}
        subtitle={`${livros.length} títulos · ${livros.reduce((s, l) => s + l.quantidade, 0)} exemplares`}
        actions={<>
          <Button variant="secondary" icon={<PenLine className="size-4" />} onClick={() => setForm({ origem: 'manual', quantidade: 1, idioma: 'Português', codigo_interno: proximoCodigoInterno(livros) })}>Sem ISBN</Button>
          <Button variant="secondary" icon={<Keyboard className="size-4" />} onClick={() => setForm({ origem: 'isbn', quantidade: 1 })}>Digitar ISBN</Button>
          <Button icon={<ScanLine className="size-4" />} onClick={() => setScan(true)}>Escanear ISBN</Button>
        </>}
      />

      <Card className="mb-4 flex flex-col gap-2 p-3 md:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por título, autor, ISBN, código ou estante" className="flex-1" />
        <Select value={origem} onChange={e => setOrigem(e.target.value)} className="md:w-48">
          <option value="">Todas as origens</option>
          <option value="isbn">Com ISBN</option>
          <option value="manual">Cadastro manual</option>
        </Select>
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-slate-600" title="Depois de salvar, a câmera abre de novo para o próximo livro">
          <input type="checkbox" checked={continuo} onChange={e => setContinuo(e.target.checked)} className="size-4 accent-royal" /> Escanear em sequência
        </label>
        <Button variant="ghost" icon={<Download className="size-4" />} onClick={exportar}>CSV</Button>
      </Card>

      {buscando && <div className="mb-4"><Alert tone="info"><Search className="mr-1 inline size-4" /> Buscando dados do livro na BrasilAPI, Google Books e Open Library...</Alert></div>}

      {error ? <ErrorBox msg={error} /> : loading ? <Spinner /> : lista.length === 0 ? (
        <Card><EmptyState icon={<BookCopy className="size-7" />} title={livros.length ? 'Nenhum livro encontrado' : 'O acervo está vazio'}
          text="Cadastre o primeiro livro apontando a câmera para o código de barras (ISBN) na contracapa."
          action={<Button icon={<ScanLine className="size-4" />} onClick={() => setScan(true)}>Escanear ISBN</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Livro</th><th className="hidden px-4 py-3 md:table-cell">ISBN / Código</th><th className="hidden px-4 py-3 lg:table-cell">Categoria</th><th className="hidden px-4 py-3 sm:table-cell">Local</th><th className="px-4 py-3 text-center">Disponíveis</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map(l => {
                  const d = disponiveis(l)
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BookCover livro={l} size="sm" className="w-10 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-navy">{l.titulo}</p>
                            <p className="truncate text-slate-500">{l.autores ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {l.isbn ? <span className="font-mono text-xs text-slate-600">{fmtIsbn(l.isbn)}</span> : <Badge tone="amber">{l.codigo_interno ?? 'manual'}</Badge>}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{l.categoria ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{l.localizacao ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', d > 0 ? 'bg-lime-50 text-leaf-dark' : 'bg-red-50 text-red-600')}>{d}/{l.quantidade}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEtiqueta(l)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Etiqueta"><Tag className="size-4" /></button>
                          <button onClick={() => setForm(l)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Editar"><Pencil className="size-4" /></button>
                          <button onClick={() => excluir(l)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Excluir"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ScannerModal open={scan} onClose={() => setScan(false)} onResult={processarCodigo} title="Escanear ISBN" hint="Aponte para o código de barras da contracapa (começa com 978 ou 979)" />
      <LivroForm rascunho={form} livros={livros} onClose={() => setForm(null)} onSaved={() => { setForm(null); if (continuo) setScan(true) }} />
      <Etiqueta livro={etiqueta} onClose={() => setEtiqueta(null)} />
    </>
  )
}

function LivroForm({ rascunho, livros, onClose, onSaved }: { rascunho: Rascunho | null; livros: Livro[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useFeedback()
  const [f, setF] = useState<Rascunho>({})
  const [salvando, setSalvando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (rascunho) { setF(rascunho); setErro(null) } }, [rascunho])

  const set = <K extends keyof Livro>(k: K, v: Livro[K]) => setF(x => ({ ...x, [k]: v }))
  const txt = (k: keyof Livro) => ({ value: (f[k] as string | number | null | undefined) ?? '', onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) })
  const editando = !!f.id
  const manual = f.origem === 'manual'

  const buscar = async () => {
    const isbn = toIsbn13(f.isbn ?? '')
    if (!isbn) { setErro('ISBN inválido. Confira os 10 ou 13 dígitos.'); return }
    const dup = livros.find(l => l.isbn === isbn && l.id !== f.id)
    if (dup) { setErro(`Este ISBN já está cadastrado: "${dup.titulo}". Edite o livro existente para aumentar os exemplares.`); return }
    setErro(null); setBuscando(true)
    const r = await buscarIsbn(isbn)
    setBuscando(false)
    if (!r) { setErro('ISBN não encontrado nas bases públicas. Preencha os dados abaixo.'); set('isbn', isbn); return }
    setF(x => ({ ...x, isbn, ...Object.fromEntries(Object.entries(r.dados).filter(([, v]) => v != null)) }))
    toast(`Dados encontrados em: ${r.fontes.join(', ')}`, 'info')
  }

  const salvar = async () => {
    setErro(null)
    if (!f.titulo?.trim()) { setErro('Informe o título.'); return }
    let isbn: string | null = null
    if (!manual) {
      isbn = toIsbn13(f.isbn ?? '')
      if (!isbn) { setErro('ISBN inválido. Se o livro não tem ISBN, use o cadastro manual.'); return }
      const dup = livros.find(l => l.isbn === isbn && l.id !== f.id)
      if (dup) { setErro(`ISBN já cadastrado em "${dup.titulo}".`); return }
    }
    if (f.capa_url && !/^https:\/\/[^\s]+$/i.test(f.capa_url)) { setErro('O link da capa deve começar com https://'); return }
    const qtd = Math.max(1, Number(f.quantidade) || 1)
    if (editando && qtd < (f.emprestados ?? 0)) { setErro(`Há ${f.emprestados} exemplar(es) emprestado(s); a quantidade não pode ser menor.`); return }
    const row: Partial<Livro> = {
      isbn, codigo_interno: manual ? (f.codigo_interno || proximoCodigoInterno(livros)) : (f.codigo_interno || null),
      titulo: f.titulo.trim(), subtitulo: f.subtitulo || null, autores: f.autores || null, editora: f.editora || null,
      ano: f.ano ? Number(f.ano) : null, paginas: f.paginas ? Number(f.paginas) : null, categoria: f.categoria || null,
      idioma: f.idioma || null, descricao: f.descricao || null, capa_url: f.capa_url || null, localizacao: f.localizacao || null,
      quantidade: qtd, origem: manual ? 'manual' : 'isbn',
    }
    setSalvando(true)
    try {
      if (editando) await db.update('livros', f.id!, row)
      else await db.insert('livros', { ...row, emprestados: 0, created_at: new Date().toISOString() })
      toast(editando ? 'Livro atualizado.' : `"${row.titulo}" cadastrado no acervo!`)
      onSaved()
    } catch (e) {
      setErro(errMsg(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={!!rascunho} onClose={onClose} size="lg"
      title={editando ? 'Editar livro' : manual ? 'Cadastro manual (sem ISBN)' : 'Cadastrar livro por ISBN'}
      subtitle={manual ? 'Para livros antigos, doações, apostilas e obras locais sem código de barras.' : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando}>Salvar livro</Button></>}>
      <div className="grid gap-6 md:grid-cols-[150px_1fr]">
        <div className="hidden md:block">
          <BookCover livro={{ titulo: f.titulo || 'Título do livro', autores: f.autores ?? null, capa_url: f.capa_url ?? null }} />
          <p className="mt-2 text-center text-xs text-slate-400">Pré-visualização</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {!manual ? (
            <Field label="ISBN" required className="sm:col-span-2" hint="10 ou 13 dígitos — clique em Buscar para preencher automaticamente">
              <div className="flex gap-2">
                <Input {...txt('isbn')} placeholder="978..." inputMode="numeric" autoFocus={!f.titulo} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscar() } }} />
                <Button variant="secondary" onClick={buscar} loading={buscando} icon={<Search className="size-4" />}>Buscar</Button>
              </div>
            </Field>
          ) : (
            <Field label="Código interno" hint="Gerado automaticamente — imprima a etiqueta e cole no livro" className="sm:col-span-2">
              <Input {...txt('codigo_interno')} />
            </Field>
          )}
          <Field label="Título" required className="sm:col-span-2"><Input {...txt('titulo')} /></Field>
          <Field label="Subtítulo" className="sm:col-span-2"><Input {...txt('subtitulo')} /></Field>
          <Field label="Autor(es)" className="sm:col-span-2" hint="Separe por vírgula"><Input {...txt('autores')} /></Field>
          <Field label="Editora"><Input {...txt('editora')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano"><Input type="number" {...txt('ano')} /></Field>
            <Field label="Páginas"><Input type="number" {...txt('paginas')} /></Field>
          </div>
          <Field label="Categoria">
            <Input list="categorias" {...txt('categoria')} placeholder="Escolha ou digite" />
            <datalist id="categorias">{CATEGORIAS.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Idioma"><Input {...txt('idioma')} /></Field>
          <Field label="Localização" hint="Ex.: Estante A2, prateleira 3"><Input {...txt('localizacao')} /></Field>
          <Field label="Nº de exemplares" required><Input type="number" min={1} {...txt('quantidade')} /></Field>
          <Field label="Link da capa (opcional)" className="sm:col-span-2"><Input {...txt('capa_url')} placeholder="https://..." /></Field>
          <Field label="Sinopse / descrição" className="sm:col-span-2"><Textarea {...txt('descricao')} /></Field>
          {erro && <div className="sm:col-span-2"><Alert tone="error">{erro}</Alert></div>}
        </div>
      </div>
    </Modal>
  )
}

function Etiqueta({ livro, onClose }: { livro: Livro | null; onClose: () => void }) {
  const codigo = livro?.isbn ?? livro?.codigo_interno ?? ''
  return (
    <Modal open={!!livro} onClose={onClose} title="Etiqueta do livro" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Fechar</Button><Button icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir</Button></>}>
      {livro && (
        <div className="flex justify-center">
          <div className="print-area">
            <div className="flex w-[300px] items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-3">
              <QrCode value={codigo} size={84} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-royal">Biblioteca Digital · Sobrália</p>
                <p className="line-clamp-2 text-sm font-extrabold leading-tight text-navy">{livro.titulo}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">{livro.isbn ? fmtIsbn(livro.isbn) : livro.codigo_interno}</p>
                {livro.localizacao && <p className="text-xs text-slate-500">{livro.localizacao}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="no-print mt-4 text-center text-xs text-slate-500">O QR Code pode ser lido na tela de empréstimo para localizar o livro.</p>
    </Modal>
  )
}


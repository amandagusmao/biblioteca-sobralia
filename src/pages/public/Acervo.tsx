import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, LibraryBig, MapPin } from 'lucide-react'
import { BookCover } from '../../components/BookCover'
import { Badge, EmptyState, ErrorBox, Modal, SearchInput, Select, Spinner } from '../../components/ui'
import { useTable } from '../../lib/db'
import { fmtIsbn } from '../../lib/isbn'
import { disponiveis } from '../../lib/services'
import type { Livro } from '../../lib/types'
import { cn, matches } from '../../lib/utils'

export default function Acervo() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [cat, setCat] = useState('')
  const [soDisp, setSoDisp] = useState(false)
  const [ordem, setOrdem] = useState<'titulo' | 'recentes'>('titulo')
  const { data: livros, loading, error } = useTable('livros')

  const categorias = useMemo(() => [...new Set(livros.map(l => l.categoria).filter(Boolean) as string[])].sort(), [livros])
  const lista = useMemo(() => livros
    .filter(l => matches(q, l.titulo, l.subtitulo, l.autores, l.editora, l.categoria, l.isbn, l.codigo_interno))
    .filter(l => !cat || l.categoria === cat)
    .filter(l => !soDisp || disponiveis(l) > 0)
    .sort((a, b) => ordem === 'titulo' ? a.titulo.localeCompare(b.titulo, 'pt-BR') : b.created_at.localeCompare(a.created_at)),
  [livros, q, cat, soDisp, ordem])

  const aberto = livros.find(l => l.id === params.get('livro'))
  const abrir = (id: string | null) => {
    const p = new URLSearchParams(params)
    if (id) p.set('livro', id); else p.delete('livro')
    setParams(p, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-leaf-dark">Catálogo público</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Acervo da biblioteca</h1>
        <p className="mt-2 text-slate-600">Encontre um livro e veja se ele está disponível para empréstimo.</p>
      </div>

      <div className="z-20 -mx-4 mb-6 md:sticky md:top-16 border-b border-slate-200/70 bg-paper/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Título, autor, assunto ou ISBN" className="flex-1" />
          <div className="flex gap-2">
            <Select value={cat} onChange={e => setCat(e.target.value)} className="min-w-0 flex-1 md:w-52 md:flex-none">
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select value={ordem} onChange={e => setOrdem(e.target.value as 'titulo')} className="w-32 shrink-0">
              <option value="titulo">A–Z</option>
              <option value="recentes">Recentes</option>
            </Select>
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            <input type="checkbox" checked={soDisp} onChange={e => setSoDisp(e.target.checked)} className="size-4 accent-leaf" />
            Só disponíveis
          </label>
        </div>
      </div>

      {error ? <ErrorBox msg={error} /> : loading ? <Spinner /> : lista.length === 0 ? (
        <EmptyState icon={<LibraryBig className="size-7" />} title="Nenhum livro encontrado" text="Tente buscar com outras palavras ou remova os filtros." />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">{lista.length} título(s)</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {lista.map(l => <LivroCard key={l.id} livro={l} onClick={() => abrir(l.id)} />)}
          </div>
        </>
      )}

      <Modal open={!!aberto} onClose={() => abrir(null)} title="Detalhes do livro" size="lg">
        {aberto && <LivroDetalhe livro={aberto} />}
      </Modal>
    </div>
  )
}

function LivroCard({ livro, onClick }: { livro: Livro; onClick: () => void }) {
  const d = disponiveis(livro)
  return (
    <button onClick={onClick} className="group text-left">
      <div className="relative">
        <BookCover livro={livro} className="transition group-hover:-translate-y-1 group-hover:shadow-xl" />
        <span className={cn('absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow',
          d > 0 ? 'bg-leaf text-white' : 'bg-white text-slate-500')}>
          {d > 0 ? 'Disponível' : 'Emprestado'}
        </span>
      </div>
      <p className="mt-2.5 line-clamp-2 font-bold leading-snug text-navy">{livro.titulo}</p>
      <p className="line-clamp-1 text-sm text-slate-500">{livro.autores ?? 'Autor não informado'}</p>
    </button>
  )
}

export function LivroDetalhe({ livro }: { livro: Livro }) {
  const d = disponiveis(livro)
  return (
    <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
      <BookCover livro={livro} size="lg" className="mx-auto w-40 sm:w-full" />
      <div>
        {livro.categoria && <Badge tone="blue">{livro.categoria}</Badge>}
        <h3 className="mt-2 text-2xl font-extrabold leading-tight text-navy">{livro.titulo}</h3>
        {livro.subtitulo && <p className="text-slate-600">{livro.subtitulo}</p>}
        <p className="mt-1 font-semibold text-slate-700">{livro.autores ?? 'Autor não informado'}</p>

        <div className={cn('mt-4 flex items-center gap-3 rounded-2xl p-4', d > 0 ? 'bg-lime-50 ring-1 ring-lime-200' : 'bg-slate-50 ring-1 ring-slate-200')}>
          <BookOpen className={cn('size-6', d > 0 ? 'text-leaf-dark' : 'text-slate-400')} />
          <div>
            <p className={cn('font-bold', d > 0 ? 'text-leaf-dark' : 'text-slate-600')}>
              {d > 0 ? `${d} de ${livro.quantidade} exemplar(es) disponível(is)` : 'Todos os exemplares estão emprestados'}
            </p>
            <p className="text-sm text-slate-500">{d > 0 ? 'Retire no balcão com sua carteirinha.' : 'Volte em alguns dias ou pergunte no balcão.'}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {([
            ['Editora', livro.editora], ['Ano', livro.ano], ['Páginas', livro.paginas], ['Idioma', livro.idioma],
            ['ISBN', livro.isbn ? fmtIsbn(livro.isbn) : null], ['Código', livro.codigo_interno],
          ] as [string, unknown][]).filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt><dd className="font-medium text-slate-700">{String(v)}</dd></div>
          ))}
        </dl>
        {livro.localizacao && <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-royal"><MapPin className="size-4" /> {livro.localizacao}</p>}
        {livro.descricao && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{livro.descricao}</p>}
      </div>
    </div>
  )
}

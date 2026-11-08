// Validação de ISBN e busca de dados em fontes GRATUITAS:
// BrasilAPI (agrega CBL, Mercado Editorial, Google Books e Open Library),
// Google Books e Open Library — nenhuma exige chave.
import type { Livro } from './types'

export function cleanIsbn(s: string): string {
  return s.toUpperCase().replace(/[^0-9X]/g, '')
}

export function isValidIsbn13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false
  const sum = s.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0)
  return sum % 10 === 0
}

export function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false
  const sum = s.split('').reduce((acc, c, i) => acc + (c === 'X' ? 10 : Number(c)) * (10 - i), 0)
  return sum % 11 === 0
}

/** Normaliza para ISBN‑13 (aceita ISBN‑10). Retorna null se inválido. */
export function toIsbn13(raw: string): string | null {
  const s = cleanIsbn(raw)
  if (isValidIsbn13(s)) return s
  if (isValidIsbn10(s)) {
    const base = '978' + s.slice(0, 9)
    const sum = base.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0)
    return base + ((10 - (sum % 10)) % 10)
  }
  return null
}

export function fmtIsbn(s: string | null): string {
  if (!s) return ''
  if (s.length === 13) return `${s.slice(0, 3)}-${s.slice(3, 5)}-${s.slice(5, 9)}-${s.slice(9, 12)}-${s.slice(12)}`
  return s
}

export type DadosLivro = Partial<Pick<Livro, 'titulo' | 'subtitulo' | 'autores' | 'editora' | 'ano' | 'paginas' | 'categoria' | 'idioma' | 'descricao' | 'capa_url'>>

async function getJSON(url: string): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7000)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const ano = (s: unknown): number | null => {
  const m = String(s ?? '').match(/\d{4}/)
  return m ? Number(m[0]) : null
}
const https = (u?: string | null) => (u ? u.replace(/^http:/, 'https:') : null)

async function brasilApi(isbn: string): Promise<DadosLivro | null> {
  const d = await getJSON(`https://brasilapi.com.br/api/isbn/v1/${isbn}`)
  if (!d?.title) return null
  return {
    titulo: d.title, subtitulo: d.subtitle || null,
    autores: Array.isArray(d.authors) ? d.authors.join(', ') : null,
    editora: d.publisher || null, ano: ano(d.year), paginas: d.page_count || null,
    categoria: Array.isArray(d.subjects) && d.subjects[0] ? d.subjects[0] : null,
    descricao: d.synopsis || null, capa_url: https(d.cover_url),
  }
}

async function googleBooks(isbn: string): Promise<DadosLivro | null> {
  const d = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
  const v = d?.items?.[0]?.volumeInfo
  if (!v?.title) return null
  const idiomas: Record<string, string> = { pt: 'Português', en: 'Inglês', es: 'Espanhol', fr: 'Francês' }
  return {
    titulo: v.title, subtitulo: v.subtitle || null, autores: v.authors?.join(', ') || null,
    editora: v.publisher || null, ano: ano(v.publishedDate), paginas: v.pageCount || null,
    categoria: v.categories?.[0] || null, idioma: idiomas[v.language] ?? v.language ?? null,
    descricao: v.description || null,
    capa_url: https(v.imageLinks?.thumbnail?.replace('&edge=curl', '')),
  }
}

async function openLibrary(isbn: string): Promise<DadosLivro | null> {
  const d = await getJSON(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
  const v = d?.[`ISBN:${isbn}`]
  if (!v?.title) return null
  return {
    titulo: v.title, subtitulo: v.subtitle || null,
    autores: v.authors?.map((a: { name: string }) => a.name).join(', ') || null,
    editora: v.publishers?.[0]?.name || null, ano: ano(v.publish_date),
    paginas: v.number_of_pages || null, capa_url: v.cover?.medium || null,
  }
}

/** Busca nas três fontes em paralelo e combina os campos encontrados. */
export async function buscarIsbn(isbn: string): Promise<{ dados: DadosLivro; fontes: string[] } | null> {
  // Consulta as 3 fontes ao mesmo tempo. Assim que a primeira responder com o livro,
  // espera no máximo mais 1,2 s pelas outras (para completar capa/sinopse) — não fica preso na mais lenta.
  const res: (DadosLivro | null | undefined)[] = [undefined, undefined, undefined]
  await new Promise<void>(resolve => {
    let pendentes = 3
    let atalho: number | undefined
    const fim = () => { clearTimeout(atalho); resolve() }
    ;[brasilApi(isbn), googleBooks(isbn), openLibrary(isbn)].forEach((p, i) => p.then(r => {
      res[i] = r
      if (--pendentes === 0) fim()
      else if (r && atalho === undefined) atalho = window.setTimeout(fim, 1200)
    }))
  })
  const [a, b, c] = res.map(r => r ?? null)
  const fontes: string[] = []
  if (a) fontes.push('BrasilAPI')
  if (b) fontes.push('Google Books')
  if (c) fontes.push('Open Library')
  if (!fontes.length) return null
  const dados: DadosLivro = {}
  for (const src of [a, b, c]) {
    if (!src) continue
    for (const [k, v] of Object.entries(src) as [keyof DadosLivro, never][]) {
      if (v != null && v !== '' && dados[k] == null) dados[k] = v
    }
  }
  return { dados, fontes }
}

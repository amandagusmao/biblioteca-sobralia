// Datas são guardadas como 'AAAA-MM-DD' (dia local) e horários como ISO.

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DIAS_LONGOS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return toISODate(new Date())
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Diferença em dias (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000)
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function fmtDateLong(s: string): string {
  const d = parseDate(s)
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES_CURTOS[d.getMonth()]}.`
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(toISODate(new Date(iso)))} ${fmtTime(iso)}`
}

export function hhmm(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : ''
}

export function idade(nascimento: string | null): number | null {
  if (!nascimento) return null
  const n = parseDate(nascimento)
  const h = new Date()
  let a = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--
  return a
}

export function minutesSince(iso: string, until?: string | null): number {
  const end = until ? new Date(until).getTime() : Date.now()
  return Math.max(0, Math.round((end - new Date(iso).getTime()) / 60_000))
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${pad(m)}` : `${h}h`
}

export function relativeDue(prevista: string): { label: string; tone: 'red' | 'amber' | 'green' } {
  const d = diffDays(today(), prevista)
  if (d < 0) return { label: `${-d} dia${d === -1 ? '' : 's'} de atraso`, tone: 'red' }
  if (d === 0) return { label: 'Vence hoje', tone: 'amber' }
  if (d <= 2) return { label: `Vence em ${d} dia${d === 1 ? '' : 's'}`, tone: 'amber' }
  return { label: `Faltam ${d} dias`, tone: 'green' }
}

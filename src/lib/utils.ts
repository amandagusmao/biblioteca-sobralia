export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Remove acentos e deixa minúsculo — para buscas. */
export function norm(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = norm(query)
  if (!q) return true
  const hay = norm(fields.filter(Boolean).join(' '))
  return q.split(/\s+/).every(t => hay.includes(t))
}

export function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

export function fmtPhone(s: string | null | undefined): string {
  const d = digits(s)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return s ?? ''
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  let d = digits(phone)
  if (d.length < 10) return null
  if (d.length <= 11) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`
}

export function downloadFile(name: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    let s = v == null ? '' : Array.isArray(v) ? v.join(' ') : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s // evita que o Excel execute fórmulas vindas de dados digitados
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n')
}

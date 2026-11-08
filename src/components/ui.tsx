import {
  createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Loader2, Search, X, XCircle } from 'lucide-react'
import { cn, matches } from '../lib/utils'

// ---------------- Botão ----------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'white'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-royal text-white hover:bg-ocean shadow-sm shadow-royal/20',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-leaf text-white hover:bg-leaf-dark shadow-sm shadow-leaf/30',
  white: 'bg-white text-royal hover:bg-blue-50 shadow-sm',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3.5 text-base',
        BTN[variant], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

// ---------------- Campos ----------------
const fieldCls = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-ink sm:text-sm placeholder:text-slate-400 transition focus:border-royal focus:outline-none focus:ring-4 focus:ring-royal/10 disabled:bg-slate-50'

export function Field({ label, hint, children, className, required }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, maxLength, ...p }, ref) {
  const texto = !p.type || ['text', 'email', 'tel', 'search', 'url', 'password'].includes(p.type)
  return <input ref={ref} className={cn(fieldCls, className)} maxLength={maxLength ?? (texto ? 200 : undefined)} {...p} />
})

export function Textarea({ className, maxLength = 1000, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, 'min-h-[88px]', className)} maxLength={maxLength} {...p} />
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldCls, 'pr-8', className)} {...p}>{children}</select>
}

export function SearchInput({ value, onChange, placeholder, className, autoFocus, onFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean; onFocus?: () => void }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar...'}
        className={cn(fieldCls, 'pl-10', value && 'pr-9')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Limpar busca">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ---------------- Badge ----------------
export type Tone = 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'violet' | 'navy'
const TONES: Record<Tone, string> = {
  blue: 'bg-blue-50 text-royal ring-blue-200',
  green: 'bg-lime-50 text-leaf-dark ring-lime-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-indigo-50 text-electric ring-indigo-200',
  navy: 'bg-navy text-white ring-navy',
}
export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>{children}</span>
}

// ---------------- Cartões e layout ----------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)]', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-royal/10 text-royal">{icon}</div>}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, icon, tone = 'blue', hint, to }: { label: string; value: ReactNode; icon: ReactNode; tone?: 'blue' | 'green' | 'red' | 'amber' | 'violet'; hint?: ReactNode; to?: string }) {
  const c = { blue: 'bg-royal/10 text-royal', green: 'bg-leaf/15 text-leaf-dark', red: 'bg-red-100 text-red-600', amber: 'bg-amber-100 text-amber-600', violet: 'bg-electric/10 text-electric' }[tone]
  return (
    <Card className={cn('relative p-4 sm:p-5', to && 'transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-royal/30')}>
      {to && <Link to={to} className="absolute inset-0 z-10 rounded-2xl" aria-label={`Ver ${label}`} />}
      <div className="flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl sm:size-11 sm:rounded-2xl', c)}>{icon}</div>
      </div>
    </Card>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-bold text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('flex justify-center py-16 text-royal', className)}><Loader2 className="size-7 animate-spin" /></div>
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
      <XCircle className="mt-0.5 size-4 shrink-0" />
      <div><b>Não foi possível carregar os dados.</b><br />{msg}</div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
      <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {items.map(it => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn('flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition',
              value === it.value ? 'bg-white text-royal shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            {it.label}
            {it.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs', value === it.value ? 'bg-royal/10' : 'bg-slate-200')}>{it.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------- Modal ----------------
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size]
  // No celular, formulários ocupam a tela inteira; confirmações ficam centralizadas.
  const pequeno = size === 'sm'
  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex justify-center sm:items-center sm:p-4', pequeno ? 'items-center p-4' : 'items-stretch')}>
      <div className="animate-fade-in absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('animate-pop-in relative flex w-full flex-col bg-white shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl',
        pequeno ? 'max-h-[90dvh] rounded-3xl' : 'h-dvh sm:h-auto', w)} role="dialog" aria-modal="true">
        <div className={cn('flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6', !pequeno && 'pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4')}>
          <div>
            <h2 className="text-lg font-extrabold text-navy">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Fechar"><X className="size-5" /></button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---------------- Alerta inline ----------------
export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  const map = {
    info: ['bg-blue-50 text-royal ring-blue-200', <Info key="i" className="mt-0.5 size-4 shrink-0" />],
    warn: ['bg-amber-50 text-amber-800 ring-amber-200', <AlertTriangle key="w" className="mt-0.5 size-4 shrink-0" />],
    error: ['bg-red-50 text-red-700 ring-red-200', <XCircle key="e" className="mt-0.5 size-4 shrink-0" />],
    success: ['bg-lime-50 text-leaf-dark ring-lime-200', <CheckCircle2 key="s" className="mt-0.5 size-4 shrink-0" />],
  } as const
  const [cls, icon] = map[tone]
  return <div className={cn('flex gap-2.5 rounded-xl p-3 text-sm ring-1', cls)}>{icon}<div>{children}</div></div>
}

// ---------------- Seletor com busca ----------------
export function SearchSelect<T extends { id: string }>({ items, value, onChange, getLabel, getSearch, render, placeholder, emptyText }: {
  items: T[]; value: string | null; onChange: (id: string | null) => void
  getLabel: (t: T) => string; getSearch: (t: T) => string; render?: (t: T) => ReactNode
  placeholder?: string; emptyText?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = items.find(i => i.id === value)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = items.filter(i => matches(q, getSearch(i))).slice(0, 40)
  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-royal/30 bg-royal/5 px-3.5 py-2">
        <div className="min-w-0 flex-1 text-sm">{render ? render(selected) : getLabel(selected)}</div>
        <button type="button" onClick={() => { onChange(null); setQ('') }} className="rounded-full p-1 text-slate-500 hover:bg-white" aria-label="Trocar"><X className="size-4" /></button>
      </div>
    )
  }
  return (
    <div ref={ref} className="relative">
      <SearchInput value={q} onChange={v => { setQ(v); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={placeholder} />
      {open && (
        <div className="scrollbar-thin absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
          {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500">{emptyText ?? 'Nada encontrado'}</p>}
          {filtered.map(i => (
            <button key={i.id} type="button" onClick={() => { onChange(i.id); setOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-royal/5">
              {render ? render(i) : getLabel(i)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- Toasts + confirmação ----------------
interface ToastItem { id: number; tone: 'success' | 'error' | 'info'; msg: ReactNode }
interface ConfirmState { msg: ReactNode; title: string; danger?: boolean; resolve: (v: boolean) => void; okLabel?: string }
interface FeedbackCtx {
  toast: (msg: ReactNode, tone?: ToastItem['tone']) => void
  confirm: (opts: { title: string; msg: ReactNode; danger?: boolean; okLabel?: string }) => Promise<boolean>
}
const FbCtx = createContext<FeedbackCtx | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [conf, setConf] = useState<ConfirmState | null>(null)
  const toast = useCallback((msg: ReactNode, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, tone, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'error' ? 6000 : 3500)
  }, [])
  const confirm = useCallback<FeedbackCtx['confirm']>(o => new Promise(resolve => setConf({ ...o, resolve })), [])
  const close = (v: boolean) => { conf?.resolve(v); setConf(null) }
  return (
    <FbCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map(t => (
          <div key={t.id} className={cn('animate-pop-in pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl',
            t.tone === 'success' && 'bg-navy', t.tone === 'error' && 'bg-red-600', t.tone === 'info' && 'bg-royal')}>
            {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf" /> : t.tone === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <div>{t.msg}</div>
          </div>
        ))}
      </div>
      <Modal open={!!conf} onClose={() => close(false)} title={conf?.title} size="sm" footer={<>
        <Button variant="secondary" onClick={() => close(false)}>Cancelar</Button>
        <Button variant={conf?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{conf?.okLabel ?? 'Confirmar'}</Button>
      </>}>
        <div className="text-sm text-slate-600">{conf?.msg}</div>
      </Modal>
    </FbCtx.Provider>
  )
}

export function useFeedback() {
  const c = useContext(FbCtx)
  if (!c) throw new Error('useFeedback fora do provider')
  return c
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const p = name.trim().split(/\s+/)
  const ini = ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
  const hues = ['bg-royal', 'bg-ocean', 'bg-electric', 'bg-leaf-dark', 'bg-navy']
  const h = hues[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length]
  return <div className={cn('grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white', h, className)}>{ini}</div>
}

// ---------------- Data com máscara (DD/MM/AAAA) ----------------
// Mais fácil que o calendário do celular para datas de nascimento.
const isoToBr = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
function brToIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m.map(Number) as unknown as [string, number, number, number]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  if (y < 1900 || dt > new Date()) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function DateInput({ value, onChange, required, id }: { value: string | null | undefined; onChange: (iso: string | null) => void; required?: boolean; id?: string }) {
  const [txt, setTxt] = useState(isoToBr(value))
  useEffect(() => { if (value && brToIso(txt) !== value) setTxt(isoToBr(value)) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const completo = txt.length === 10
  const invalido = completo && !brToIso(txt)
  return (
    <>
      <Input
        id={id}
        value={txt}
        required={required}
        inputMode="numeric"
        autoComplete="bday"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        aria-invalid={invalido}
        className={invalido ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : undefined}
        onChange={e => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 8)
          const f = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
          setTxt(f)
          onChange(brToIso(f))
        }}
      />
      {invalido && <span className="mt-1 block text-xs font-semibold text-red-600">Data inválida</span>}
    </>
  )
}

// ---------------- Senha com botão mostrar/ocultar ----------------
export function SenhaInput({ value, onChange, autoComplete, minLength }: { value: string; onChange: (v: string) => void; autoComplete?: string; minLength?: number }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <Input type={ver ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} minLength={minLength} maxLength={72} required className="pr-11" />
      <button type="button" onClick={() => setVer(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

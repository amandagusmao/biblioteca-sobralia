import { cn } from '../lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} aria-hidden="true">
      <defs>
        <linearGradient id="bd-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0511F2" />
          <stop offset=".55" stopColor="#0339A6" />
          <stop offset="1" stopColor="#034C8C" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#bd-g)" />
      <path d="M17 19 Q32 7 47 19" fill="none" stroke="#7CBF17" strokeWidth="4" strokeLinecap="round" />
      <path d="M11 25 C19 21 26 22 32 27 L32 50 C26 45.5 19 45 11 48 Z" fill="#fff" />
      <path d="M53 25 C45 21 38 22 32 27 L32 50 C38 45.5 45 45 53 48 Z" fill="#fff" opacity=".86" />
      <path d="M16 31 C20 29.5 24 30 27 32 M16 36.5 C20 35 24 35.5 27 37.5" stroke="#0339A6" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <rect x="38" y="31" width="4" height="4" rx="1" fill="#7CBF17" />
      <rect x="44" y="30" width="4" height="4" rx="1" fill="#0511F2" />
      <rect x="41" y="37" width="4" height="4" rx="1" fill="#0339A6" />
    </svg>
  )
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-none">
        <div className={cn('text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>
          Biblioteca <span className={light ? 'text-leaf' : 'text-royal'}>Digital</span>
        </div>
        <div className={cn('mt-1 text-[10px] font-bold uppercase tracking-[.22em]', light ? 'text-blue-200' : 'text-leaf-dark')}>Sobrália · MG</div>
      </div>
    </div>
  )
}
